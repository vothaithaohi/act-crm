import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { clientIp, isRateLimited } from '@/lib/dienvienvn/rate-limit';
import { getCrewUser } from '@/lib/dienvienvn/crew-server';
import { CREW_FILES_MISSING, listCvs, readPdf, removeCvFileIfUnused, storePdf } from '@/lib/dienvienvn/crew-files';
import { CREW_MAX_CVS, CrewCv } from '@/lib/dienvienvn/crew-profiles';

// Kho CV của ứng viên ekip đang đăng nhập: xem, thêm (file PDF / link), đặt mặc định, xoá.
async function who(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return { res: NextResponse.json({ mode: 'demo', cvs: [] }) };
  if (!db) return { res: NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 }) };
  const u = await getCrewUser(req, db);
  if (u instanceof NextResponse) return { res: u };
  if (!u.crew) return { res: NextResponse.json({ error: 'Vui lòng tạo hồ sơ ekip trước.', noProfile: true }, { status: 404 }) };
  if (u.crew.review_status === 'rejected') return { res: NextResponse.json({ error: 'Tài khoản ekip đang bị khoá. Vui lòng liên hệ DienVienVN.' }, { status: 403 }) };
  return { db, crew: u.crew };
}

const listResponse = async (db: NonNullable<ReturnType<typeof getServiceDb>['db']>, crewId: string) =>
  NextResponse.json({ cvs: await listCvs(db, crewId) }, { headers: { 'Cache-Control': 'no-store' } });

export async function GET(req: NextRequest) {
  const w = await who(req);
  if ('res' in w) return w.res;
  return listResponse(w.db, w.crew.id);
}

const linkSchema = z.object({
  title: z.string().trim().min(1, 'Vui lòng đặt tên cho CV.').max(80),
  link_url: z.string().trim().url('Link chưa đúng định dạng.').max(500).refine(u => /^https?:\/\//i.test(u), 'Link phải bắt đầu bằng http(s)://')
});

/** Thêm CV: multipart (file PDF + title) hoặc JSON { title, link_url }. CV đầu tiên tự thành mặc định. */
export async function POST(req: NextRequest) {
  const w = await who(req);
  if ('res' in w) return w.res;
  const { db, crew } = w;
  if (isRateLimited(`crew-cv:${crew.id}`, 30, 60 * 60 * 1000)) return NextResponse.json({ error: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' }, { status: 429 });

  const { count, error: countErr } = await db.from('crew_cvs').select('id', { count: 'exact', head: true }).eq('crew_profile_id', crew.id);
  if (countErr) return NextResponse.json({ error: CREW_FILES_MISSING }, { status: 500 });
  if ((count || 0) >= CREW_MAX_CVS) return NextResponse.json({ error: `Kho CV tối đa ${CREW_MAX_CVS} CV. Vui lòng xoá bớt CV cũ.` }, { status: 400 });

  let row: Partial<CrewCv>;
  if ((req.headers.get('content-type') || '').includes('multipart/form-data')) {
    const form = await req.formData().catch(() => null);
    const pdf = await readPdf(form?.get('file') ?? null);
    if ('error' in pdf) return NextResponse.json({ error: pdf.error }, { status: 400 });
    const title = String(form?.get('title') || '').trim().slice(0, 80) || pdf.name.replace(/\.pdf$/i, '');
    const path = await storePdf(db, crew.id, 'cv', pdf.buffer);
    if (!path) return NextResponse.json({ error: 'Không tải được CV lên. Vui lòng thử lại.' }, { status: 500 });
    row = { title, file_path: path, file_name: pdf.name, file_size: pdf.size };
  } else {
    const parsed = linkSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Thông tin chưa hợp lệ.' }, { status: 400 });
    row = { title: parsed.data.title, link_url: parsed.data.link_url };
  }
  const { data: inserted, error } = await db
    .from('crew_cvs')
    .insert({ ...row, crew_profile_id: crew.id, is_default: !count })
    .select('id')
    .single();
  if (error) {
    if (row.file_path) await removeCvFileIfUnused(db, { file_path: row.file_path });
    return NextResponse.json({ error: 'Không lưu được CV. Vui lòng thử lại.' }, { status: 500 });
  }
  const res = await listResponse(db, crew.id);
  const body = await res.json();
  return NextResponse.json({ ...body, id: inserted.id });
}

/** Đặt CV mặc định. */
export async function PATCH(req: NextRequest) {
  const w = await who(req);
  if ('res' in w) return w.res;
  const { db, crew } = w;
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  const id = body?.id || '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Không tìm thấy CV.' }, { status: 404 });
  const { data: cv } = await db.from('crew_cvs').select('id').eq('id', id).eq('crew_profile_id', crew.id).maybeSingle();
  if (!cv) return NextResponse.json({ error: 'Không tìm thấy CV.' }, { status: 404 });
  await db.from('crew_cvs').update({ is_default: false }).eq('crew_profile_id', crew.id).neq('id', id);
  await db.from('crew_cvs').update({ is_default: true }).eq('id', id);
  return listResponse(db, crew.id);
}

/** Xoá CV khỏi kho (?id=). Bản đã nộp cho NSX vẫn còn. Xoá CV mặc định → CV cũ nhất còn lại thành mặc định. */
export async function DELETE(req: NextRequest) {
  const w = await who(req);
  if ('res' in w) return w.res;
  const { db, crew } = w;
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Không tìm thấy CV.' }, { status: 404 });
  const { data: cv } = await db.from('crew_cvs').select('*').eq('id', id).eq('crew_profile_id', crew.id).maybeSingle();
  if (!cv) return NextResponse.json({ error: 'Không tìm thấy CV.' }, { status: 404 });
  const { error } = await db.from('crew_cvs').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Không xoá được CV. Vui lòng thử lại.' }, { status: 500 });
  await removeCvFileIfUnused(db, cv as CrewCv);
  if ((cv as CrewCv).is_default) {
    const { data: rest } = await db.from('crew_cvs').select('id').eq('crew_profile_id', crew.id).order('created_at', { ascending: true }).limit(1);
    if (rest?.[0]) await db.from('crew_cvs').update({ is_default: true }).eq('id', rest[0].id);
  }
  return listResponse(db, crew.id);
}
