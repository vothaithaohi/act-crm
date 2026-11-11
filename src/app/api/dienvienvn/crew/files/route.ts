import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isRateLimited } from '@/lib/dienvienvn/rate-limit';
import { CREW_FILES_MISSING, looksLikePdf, maxOf, newPath, ownsPath, removeFileIfUnused, storePdf, verifyStoredPdf } from '@/lib/dienvienvn/crew-files';
import { COVER_LETTER_MAX, CREW_SERVER_UPLOAD_MAX, CrewCv, CrewFileKind } from '@/lib/dienvienvn/crew-profiles';
import { FilesCtx, countOf, filesCtx, fullMessage, listResponse, parseKind } from './shared';

// Kho file của tài khoản ekip: CV (PDF) + cover letter (viết tay / PDF). Xem, thêm, đặt mặc định, xoá.
export async function GET(req: NextRequest) {
  const ctx = await filesCtx(req);
  if ('res' in ctx) return ctx.res;
  return listResponse(ctx);
}

const cleanTitle = (t: unknown, fallback: string) =>
  (typeof t === 'string' ? t : '').replace(/\.pdf$/i, '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80) || fallback;

async function insertFile(ctx: FilesCtx, kind: CrewFileKind, row: Partial<CrewCv>) {
  const count = await countOf(ctx, kind);
  if (count === null) return NextResponse.json({ error: CREW_FILES_MISSING }, { status: 500 });
  if (count >= maxOf(kind)) {
    if (row.file_path) await removeFileIfUnused(ctx.db, row.file_path);
    return NextResponse.json({ error: fullMessage(kind), full: true }, { status: 400 });
  }
  const { data, error } = await ctx.db
    .from('crew_cvs')
    .insert({ ...row, kind, auth_user_id: ctx.user.id, crew_profile_id: ctx.crew?.id || null, is_default: count === 0 })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[dienvienvn] Lưu file ekip lỗi:', error?.message);
    if (row.file_path) await removeFileIfUnused(ctx.db, row.file_path);
    return NextResponse.json({ error: /kind|body|auth_user_id|schema cache|crew_cvs/i.test(error?.message || '') ? CREW_FILES_MISSING : 'Không lưu được. Vui lòng thử lại.' }, { status: 500 });
  }
  return listResponse(ctx, { id: data.id });
}

/**
 * Thêm file:
 * - JSON { kind, path, name, title }: file đã tải thẳng lên kho (bước 2) → kiểm tra đúng PDF rồi lưu.
 * - JSON { kind: 'cover', title, body }: cover letter viết tay.
 * - multipart (file, kind, title): đường dự phòng qua máy chủ, tối đa 4MB.
 */
export async function POST(req: NextRequest) {
  const ctx = await filesCtx(req);
  if ('res' in ctx) return ctx.res;
  if (isRateLimited(`crew-file:${ctx.user.id}`, 40, 60 * 60 * 1000)) return NextResponse.json({ error: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' }, { status: 429 });

  if ((req.headers.get('content-type') || '').includes('multipart/form-data')) {
    const form = await req.formData().catch(() => null);
    const kind = parseKind(form?.get('kind'));
    const file = form?.get('file');
    if (!kind || !(file instanceof File)) return NextResponse.json({ error: 'Chưa chọn file.' }, { status: 400 });
    if (file.size > CREW_SERVER_UPLOAD_MAX) return NextResponse.json({ error: 'Không tải được file lớn hơn 4MB lúc này. Vui lòng thử lại sau ít phút.' }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.length || !looksLikePdf(buffer)) return NextResponse.json({ error: 'File không phải PDF hợp lệ. Vui lòng xuất lại file PDF rồi tải lên.' }, { status: 400 });
    const count = await countOf(ctx, kind);
    if (count === null) return NextResponse.json({ error: CREW_FILES_MISSING }, { status: 500 });
    if (count >= maxOf(kind)) return NextResponse.json({ error: fullMessage(kind), full: true }, { status: 400 });
    const path = newPath(ctx.user.id, kind);
    if (!(await storePdf(ctx.db, path, buffer))) return NextResponse.json({ error: CREW_FILES_MISSING }, { status: 500 });
    const name = (file.name || `${kind}.pdf`).slice(0, 120);
    return insertFile(ctx, kind, { title: cleanTitle(form?.get('title') || name, kind === 'cv' ? 'CV' : 'Cover letter'), file_path: path, file_name: name, file_size: buffer.length });
  }

  const body = (await req.json().catch(() => null)) as { kind?: string; path?: string; name?: string; title?: string; body?: string } | null;
  const kind = parseKind(body?.kind);
  if (!kind) return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });

  if (body?.path) {
    if (!ownsPath([ctx.user.id], body.path) || !body.path.includes(`/${kind}/`)) return NextResponse.json({ error: 'File không hợp lệ.' }, { status: 400 });
    const check = await verifyStoredPdf(ctx.db, body.path);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
    const name = (body.name || `${kind}.pdf`).replace(/[\u0000-\u001f]/g, '').slice(0, 120);
    return insertFile(ctx, kind, { title: cleanTitle(body.title || name, kind === 'cv' ? 'CV' : 'Cover letter'), file_path: body.path, file_name: name, file_size: check.size });
  }

  if (kind !== 'cover') return NextResponse.json({ error: 'Vui lòng tải CV dạng file PDF.' }, { status: 400 });
  const parsed = z
    .object({ title: z.string().trim().max(80).optional(), body: z.string().trim().min(20, 'Cover letter cần ít nhất 20 ký tự.').max(COVER_LETTER_MAX) })
    .safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, { status: 400 });
  return insertFile(ctx, 'cover', { title: cleanTitle(parsed.data.title, 'Cover letter'), body: parsed.data.body });
}

async function findOwn(ctx: FilesCtx, id: string): Promise<CrewCv | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await ctx.db.from('crew_cvs').select('*').eq('id', id).maybeSingle();
  const row = data as CrewCv | null;
  if (!row) return null;
  return row.auth_user_id === ctx.user.id || (!!ctx.crew && row.crew_profile_id === ctx.crew.id) ? row : null;
}

/** Đặt file mặc định (trong cùng loại). */
export async function PATCH(req: NextRequest) {
  const ctx = await filesCtx(req);
  if ('res' in ctx) return ctx.res;
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  const row = await findOwn(ctx, body?.id || '');
  if (!row) return NextResponse.json({ error: 'Không tìm thấy file.' }, { status: 404 });
  const kind = row.kind || 'cv';
  const others = await ctx.db.from('crew_cvs').select('id').eq('kind', kind).or(`auth_user_id.eq.${ctx.user.id}${ctx.crew ? `,crew_profile_id.eq.${ctx.crew.id}` : ''}`);
  const ids = (others.data || []).map(r => r.id as string).filter(id => id !== row.id);
  if (ids.length) await ctx.db.from('crew_cvs').update({ is_default: false }).in('id', ids);
  await ctx.db.from('crew_cvs').update({ is_default: true }).eq('id', row.id);
  return listResponse(ctx);
}

/** Xoá file (?id=). Bản đã nộp cho NSX vẫn còn. Xoá file mặc định → file cũ nhất còn lại thành mặc định. */
export async function DELETE(req: NextRequest) {
  const ctx = await filesCtx(req);
  if ('res' in ctx) return ctx.res;
  const row = await findOwn(ctx, req.nextUrl.searchParams.get('id') || '');
  if (!row) return NextResponse.json({ error: 'Không tìm thấy file.' }, { status: 404 });
  const { error } = await ctx.db.from('crew_cvs').delete().eq('id', row.id);
  if (error) return NextResponse.json({ error: 'Không xoá được. Vui lòng thử lại.' }, { status: 500 });
  await removeFileIfUnused(ctx.db, row.file_path);
  if (row.is_default) {
    const { data: rest } = await ctx.db
      .from('crew_cvs')
      .select('id')
      .eq('kind', row.kind || 'cv')
      .or(`auth_user_id.eq.${ctx.user.id}${ctx.crew ? `,crew_profile_id.eq.${ctx.crew.id}` : ''}`)
      .order('created_at', { ascending: true })
      .limit(1);
    if (rest?.[0]) await ctx.db.from('crew_cvs').update({ is_default: true }).eq('id', rest[0].id);
  }
  return listResponse(ctx);
}
