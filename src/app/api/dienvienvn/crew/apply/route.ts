import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { applyCrewToJob, getCrewUser, openJob } from '@/lib/dienvienvn/crew-server';
import { CV_REQUIRED_MESSAGE, crewHasCv } from '@/lib/dienvienvn/crew-profiles';

// Ekip đã có hồ sơ và đang đăng nhập: ứng tuyển một tin tuyển ekip.
export async function POST(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo', applied: 'applied' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });
  const who = await getCrewUser(req, db);
  if (who instanceof NextResponse) return who;
  if (!who.crew) return NextResponse.json({ error: 'Bạn chưa có hồ sơ ekip.', noProfile: true }, { status: 404 });
  if (who.crew.review_status === 'rejected') {
    return NextResponse.json({ error: 'Hồ sơ ekip chưa được duyệt. Vui lòng cập nhật hồ sơ hoặc liên hệ DienVienVN.' }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as { job_id?: string } | null;
  const job = await openJob(db, body?.job_id || '');
  if (!job) return NextResponse.json({ error: 'Tin tuyển dụng đã đóng hoặc không còn nhận hồ sơ.' }, { status: 404 });
  if (job.requires_cv && !crewHasCv(who.crew)) return NextResponse.json({ error: CV_REQUIRED_MESSAGE, needCv: true }, { status: 400 });
  const applied = await applyCrewToJob(db, who.crew, job, req.headers);
  if (applied === 'failed') return NextResponse.json({ error: 'Không gửi được ứng tuyển. Vui lòng thử lại.' }, { status: 500 });
  return NextResponse.json({ applied, review_status: who.crew.review_status });
}
