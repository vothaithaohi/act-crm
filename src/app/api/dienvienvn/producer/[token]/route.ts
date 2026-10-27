import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { buildProducerView } from '@/lib/projects/producer';
import { CastingProject, ProjectApplication, producerTokenFromParam } from '@/lib/projects/types';
import { TalentProfile } from '@/lib/types/crm';

// Link gửi nhà sản xuất: ai có link (mã ngẫu nhiên 12 ký tự; link cũ 48 ký tự vẫn dùng được) mới xem được.
// Đường dẫn dạng "ten-du-an-<mã>": phần tên chỉ để dễ đọc, chỉ mã sau dấu "-" cuối cùng được kiểm tra.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const token = producerTokenFromParam((await params).token);
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  if (!/^[0-9a-z]{12,128}$/i.test(token)) {
    return NextResponse.json({ error: 'Link không hợp lệ hoặc đã bị thu hồi.' }, { status: 404 });
  }

  const { data: project } = await db.from('casting_projects').select('*').eq('share_token', token).maybeSingle();
  if (!project) return NextResponse.json({ error: 'Link không hợp lệ hoặc đã bị thu hồi.' }, { status: 404 });

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
