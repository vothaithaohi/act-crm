import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { chain, guardRecap, loadOwned } from '@/lib/recap/server';
import { getRecapAI } from '@/lib/recap/ai';
import { AUDIO_BUCKET } from '@/lib/recap/types';

type Ctx = { params: Promise<{ id: string }> };
const NOT_FOUND = () => NextResponse.json({ error: 'Không tìm thấy cuộc họp.' }, { status: 404 });

export async function GET(req: NextRequest, { params }: Ctx) {
  const g = await guardRecap(req);
  if ('res' in g) return g.res;
  const m = await loadOwned(g.db, (await params).id, g.staff, g.admin);
  if (!m) return NOT_FOUND();
  const { ai_file, ai_file_uri, lock_until, ...rest } = m as typeof m & { ai_file?: string; ai_file_uri?: string; lock_until?: string | null };
  void ai_file;
  void ai_file_uri;
  // Đang xử lý mà không còn lượt chạy nào giữ (VD máy chủ khởi động lại) → máy chủ tự chạy tiếp
  const stalled = (rest.status === 'transcribing' || rest.status === 'summarizing') && (!lock_until || Date.parse(lock_until) < Date.now());
  if (stalled) {
    const origin = req.nextUrl.origin;
    after(() => chain(origin, rest.id));
  }
  return NextResponse.json({ meeting: rest }, { headers: { 'Cache-Control': 'no-store' } });
}

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  recap_markdown: z.string().max(200_000).optional(),
  segments: z.array(z.object({ t: z.number().nonnegative(), speaker: z.string().max(20), text: z.string().max(20_000) })).max(20_000).optional(),
  speakers: z.record(z.string().max(20), z.string().max(80)).optional()
});

/** Lưu chỉnh sửa (tên cuộc họp, biên bản, transcript, tên người nói). */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const g = await guardRecap(req);
  if ('res' in g) return g.res;
  const m = await loadOwned(g.db, (await params).id, g.staff, g.admin);
  if (!m) return NOT_FOUND();
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Nội dung chưa hợp lệ.' }, { status: 400 });
  const { data, error } = await g.db
    .from('meeting_recaps')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', m.id)
    .select('updated_at')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Không lưu được. Vui lòng thử lại.' }, { status: 500 });
  return NextResponse.json({ ok: true, updated_at: data?.updated_at });
}

/**
 * action: "start" (đã tải file xong / thử lại khi lỗi) | "resummarize" (tạo lại tóm tắt sau khi sửa transcript, đổi tên người nói).
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const g = await guardRecap(req);
  if ('res' in g) return g.res;
  const m = await loadOwned(g.db, (await params).id, g.staff, g.admin);
  if (!m) return NOT_FOUND();
  if (!getRecapAI()) return NextResponse.json({ error: 'Máy chủ chưa có GEMINI_API_KEY.' }, { status: 500 });
  const { action } = await req.json().catch(() => ({ action: '' }));
  let patch: Record<string, unknown>;
  if (action === 'start') {
    if (m.status !== 'uploading' && m.status !== 'failed') return NextResponse.json({ ok: true });
    const p = m.progress || {};
    const transcribed = !!p.total && (p.done || 0) >= p.total;
    patch = { status: transcribed ? 'summarizing' : 'transcribing', error: null, attempts: 0, lock_until: null };
  } else if (action === 'resummarize') {
    if (m.status !== 'completed' && m.status !== 'failed') return NextResponse.json({ error: 'Cuộc họp đang được xử lý.' }, { status: 409 });
    if (!(m.segments || []).length) return NextResponse.json({ error: 'Chưa có transcript để tóm tắt.' }, { status: 400 });
    patch = { status: 'summarizing', error: null, attempts: 0, lock_until: null };
  } else return NextResponse.json({ error: 'Thao tác không hợp lệ.' }, { status: 400 });
  await g.db.from('meeting_recaps').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', m.id);
  const origin = req.nextUrl.origin;
  after(() => chain(origin, m.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const g = await guardRecap(req);
  if ('res' in g) return g.res;
  const m = (await loadOwned(g.db, (await params).id, g.staff, g.admin)) as (Awaited<ReturnType<typeof loadOwned>> & { ai_file?: string | null; ai_file_uri?: string | null }) | null;
  if (!m) return NOT_FOUND();
  if (m.audio_path) await g.db.storage.from(AUDIO_BUCKET).remove([m.audio_path]);
  const ai = getRecapAI();
  if (ai && m.ai_file && m.ai_file_uri) await ai.remove({ name: m.ai_file, uri: m.ai_file_uri, mime: m.audio_mime || '' });
  const { error } = await g.db.from('meeting_recaps').delete().eq('id', m.id);
  if (error) return NextResponse.json({ error: 'Không xoá được.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
