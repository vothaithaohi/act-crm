import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { buildProducerView } from '@/lib/projects/producer';
import { CastingProject, ProjectApplication, producerTokenFromParam } from '@/lib/projects/types';
import { TalentProfile } from '@/lib/types/crm';
import { clientIp, isBlocked, recordHit } from '@/lib/dienvienvn/rate-limit';

// Link gửi nhà sản xuất: ai có link (mã ngẫu nhiên 6 ký tự; link cũ 12 / 48 ký tự vẫn dùng được) mới xem được.
// IP thử link sai quá nhiều lần bị chặn tạm thời, để không ai dò được mã.
// Đường dẫn dạng "ten-du-an-<mã>": phần tên chỉ để dễ đọc, chỉ mã sau dấu "-" cuối cùng được kiểm tra.
const FAIL_LIMIT = 20;
const FAIL_WINDOW_MS = 60 * 60 * 1000;
const NOT_FOUND = 'Link không hợp lệ hoặc đã bị thu hồi.';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const token = producerTokenFromParam((await params).token);
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const failKey = `nsx-fail:${clientIp(req.headers)}`;
  if (isBlocked(failKey, FAIL_LIMIT, FAIL_WINDOW_MS)) {
    return NextResponse.json({ error: 'Bạn đã mở sai link quá nhiều lần. Vui lòng thử lại sau 1 giờ.' }, { status: 429 });
  }
  if (!/^[0-9a-z]{6,128}$/i.test(token)) {
    recordHit(failKey);
    return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  }

  const { data: project } = await db.from('casting_projects').select('*').eq('share_token', token).maybeSingle();
  if (!project) {
    recordHit(failKey);
    return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  }

  const { data: applications, error: appErr } = await db
    .from('project_applications')
    .select('*')
    .eq('project_id', project.id)
    .neq('status', 'rejected')
    .order('created_at', { ascending: true });
  if (appErr) return NextResponse.json({ error: 'Không tải được danh sách ứng viên.' }, { status: 500 });

  const talentIds = Array.from(new Set((applications || []).map(a => a.talent_id)));
  let talents: TalentProfile[] = [];
  if (talentIds.length) {
    const { data, error } = await db.from('talent_profiles').select('*').in('id', talentIds);
    if (error) return NextResponse.json({ error: 'Không tải được hồ sơ diễn viên.' }, { status: 500 });
    talents = (data || []) as TalentProfile[];
  }

  const view = buildProducerView(project as CastingProject, (applications || []) as ProjectApplication[], talents);
  return NextResponse.json(
    { mode: 'live', ...view },
    { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } }
  );
}
