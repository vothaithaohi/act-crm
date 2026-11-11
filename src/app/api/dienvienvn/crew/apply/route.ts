import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { applyCrewToJob, getCrewUser, openJob } from '@/lib/dienvienvn/crew-server';
import { ownsPath } from '@/lib/dienvienvn/crew-files';
import { COVER_LETTER_MAX, CV_REQUIRED_MESSAGE, CrewCv } from '@/lib/dienvienvn/crew-profiles';

// Ứng viên ekip đang đăng nhập (đã có hồ sơ) ứng tuyển một tin: chọn 1 CV trong kho, cover letter (viết / PDF) không bắt buộc.
export async function POST(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo', applied: 'applied' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });
  const who = await getCrewUser(req, db);
  if (who instanceof NextResponse) return who;
  if (!who.crew) return NextResponse.json({ error: 'Bạn chưa có hồ sơ ekip.', noProfile: true }, { status: 404 });
  if (who.crew.review_status === 'rejected') {
    return NextResponse.json({ error: 'Tài khoản ekip đang bị khoá. Vui lòng liên hệ DienVienVN.' }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as { job_id?: string; cv_id?: string | null; cover_letter?: string; cover_letter_path?: string | null } | null;
  const job = await openJob(db, body?.job_id || '');
  if (!job) return NextResponse.json({ error: 'Tin tuyển dụng đã đóng hoặc không còn nhận hồ sơ.' }, { status: 404 });

  let cv: CrewCv | null = null;
  if (body?.cv_id) {
    if (!/^[0-9a-f-]{36}$/i.test(body.cv_id)) return NextResponse.json({ error: 'Không tìm thấy CV.' }, { status: 400 });
    const { data } = await db.from('crew_cvs').select('*').eq('id', body.cv_id).eq('crew_profile_id', who.crew.id).maybeSingle();
    if (!data) return NextResponse.json({ error: 'Không tìm thấy CV. Vui lòng chọn lại.' }, { status: 400 });
    cv = data as CrewCv;
  }
  if (job.requires_cv && !cv) return NextResponse.json({ error: CV_REQUIRED_MESSAGE, needCv: true }, { status: 400 });
  const coverPath = body?.cover_letter_path || null;
  if (coverPath && !ownsPath(who.crew.id, coverPath)) return NextResponse.json({ error: 'File cover letter không hợp lệ.' }, { status: 400 });
  const cover = (body?.cover_letter || '').trim().slice(0, COVER_LETTER_MAX) || null;

  const applied = await applyCrewToJob(db, who.crew, job, req.headers, {
    cv_title: cv?.title || null,
    cv_path: cv?.file_path || null,
    cv_link: cv && !cv.file_path ? cv.link_url : null,
    cover_letter: cover,
    cover_letter_path: coverPath
  });
  if (applied === 'failed') return NextResponse.json({ error: 'Không gửi được ứng tuyển. Vui lòng thử lại.' }, { status: 500 });
  return NextResponse.json({ applied, review_status: who.crew.review_status });
}
