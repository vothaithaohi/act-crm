import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { applyCrewToJob, getCrewUser, openJob } from '@/lib/dienvienvn/crew-server';
import { COVER_LETTER_MAX, CrewCv, CrewFileKind, CrewProfile, attachMissing, attachRequirementOf } from '@/lib/dienvienvn/crew-profiles';
import type { SupabaseClient } from '@supabase/supabase-js';

/** File trong kho của đúng tài khoản này (theo tài khoản đăng nhập hoặc theo hồ sơ ekip). */
async function ownFile(db: SupabaseClient, userId: string, crew: CrewProfile, id: string | null | undefined, kind: CrewFileKind): Promise<CrewCv | null | 'bad'> {
  if (!id) return null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return 'bad';
  const { data } = await db.from('crew_cvs').select('*').eq('id', id).maybeSingle();
  const row = data as CrewCv | null;
  if (!row || (row.kind || 'cv') !== kind || (row.auth_user_id !== userId && row.crew_profile_id !== crew.id)) return 'bad';
  return row;
}

// Ứng viên ekip đang đăng nhập (đã có hồ sơ) ứng tuyển một tin: cover letter (chọn trong kho / viết mới, không bắt buộc)
// + CV và / hoặc Portfolio trong kho (file PDF), theo yêu cầu hồ sơ đính kèm của tin.
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
  const body = (await req.json().catch(() => null)) as { job_id?: string; cv_id?: string | null; portfolio_id?: string | null; cover_id?: string | null; cover_letter?: string } | null;
  const job = await openJob(db, body?.job_id || '');
  if (!job) return NextResponse.json({ error: 'Tin tuyển dụng đã đóng hoặc không còn nhận hồ sơ.' }, { status: 404 });

  const cv = await ownFile(db, who.user.id, who.crew, body?.cv_id, 'cv');
  if (cv === 'bad') return NextResponse.json({ error: 'Không tìm thấy CV. Vui lòng chọn lại.' }, { status: 400 });
  const portfolio = await ownFile(db, who.user.id, who.crew, body?.portfolio_id, 'portfolio');
  if (portfolio === 'bad') return NextResponse.json({ error: 'Không tìm thấy Portfolio. Vui lòng chọn lại.' }, { status: 400 });
  const missing = attachMissing(attachRequirementOf(job), !!cv, !!portfolio);
  if (missing) return NextResponse.json({ error: missing, needAttachment: true }, { status: 400 });
  const cover = await ownFile(db, who.user.id, who.crew, body?.cover_id, 'cover');
  if (cover === 'bad') return NextResponse.json({ error: 'Không tìm thấy cover letter. Vui lòng chọn lại.' }, { status: 400 });
  const written = (body?.cover_letter || '').trim().slice(0, COVER_LETTER_MAX) || null;

  const applied = await applyCrewToJob(db, who.crew, job, req.headers, {
    cv_title: cv?.title || null,
    cv_path: cv?.file_path || null,
    cv_link: cv && !cv.file_path ? cv.link_url : null,
    cover_letter: cover ? cover.body : written,
    cover_letter_path: cover?.file_path || null,
    // Chỉ gửi cột portfolio khi có (tin cũ / chưa chạy migration 20261123 vẫn ứng tuyển được)
    ...(portfolio ? { portfolio_title: portfolio.title, portfolio_path: portfolio.file_path } : {})
  });
  if (applied === 'failed') return NextResponse.json({ error: 'Không gửi được ứng tuyển. Vui lòng thử lại.' }, { status: 500 });
  return NextResponse.json({ applied, review_status: who.crew.review_status });
}
