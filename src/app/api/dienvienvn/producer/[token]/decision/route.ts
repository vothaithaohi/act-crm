import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { producerTokenFromParam } from '@/lib/projects/types';
import { clientIp, isBlocked, recordHit } from '@/lib/dienvienvn/rate-limit';
import { parseDecisionBody, saveProducerDecision } from '@/lib/projects/producer-decision';
import { getPartner } from '@/lib/dienvienvn/partner-server';

// NSX đánh dấu Chọn / Cân nhắc / Loại trên link shortlist. Chỉ đối tác đã đăng nhập (tài khoản đang hoạt động). ACT xem lại trong CRM.
const NOT_FOUND = 'Link không hợp lệ hoặc đã bị thu hồi.';

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const token = producerTokenFromParam((await params).token);
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const ip = clientIp(req.headers);
  if (isBlocked(`nsx-fail:${ip}`, 20, 60 * 60 * 1000) || isBlocked(`nsx-decide:${ip}`, 600, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.' }, { status: 429 });
  }
  recordHit(`nsx-decide:${ip}`);
  if (!/^[0-9a-z]{6,128}$/i.test(token)) {
    recordHit(`nsx-fail:${ip}`);
    return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  }
  // Chưa đăng nhập đối tác: không được chọn (link gửi cho ai cũng xem được)
  const partner = await getPartner(req, db);
  if (partner instanceof NextResponse) {
    return NextResponse.json({ error: 'Vui lòng đăng nhập tài khoản đối tác để chọn diễn viên.', authRequired: true }, { status: 401 });
  }
  const input = parseDecisionBody(await req.json().catch(() => null));
  if (!input) return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });

  const { data: project } = await db.from('casting_projects').select('id').eq('share_token', token).maybeSingle();
  if (!project) {
    recordHit(`nsx-fail:${ip}`);
    return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  }
  const result = await saveProducerDecision(db, project.id, input.applicationId, input.decision);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, decision: input.decision });
}
