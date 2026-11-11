import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { getPartner, partnerProjectView } from '@/lib/dienvienvn/partner-server';
import { SHORTLIST_STATUSES } from '@/lib/projects/producer';
import { parseDecisionBody, saveProducerDecision } from '@/lib/projects/producer-decision';

// Đối tác đánh dấu Chọn / Cân nhắc / Loại cho ứng viên của dự án được gắn (cổng đối tác).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const partner = await getPartner(req, db);
  if (partner instanceof NextResponse) return partner;

  const input = parseDecisionBody(await req.json().catch(() => null));
  if (!input) return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });

  const { id } = await params;
  const view = /^[0-9a-z-]{1,100}$/i.test(id) ? await partnerProjectView(db, partner, id) : null;
  if (!view) return NextResponse.json({ error: 'Không tìm thấy dự án hoặc bạn chưa được gắn vào dự án này.' }, { status: 404 });

  const result = await saveProducerDecision(db, view.id, input.applicationId, input.decision, SHORTLIST_STATUSES);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, decision: input.decision });
}
