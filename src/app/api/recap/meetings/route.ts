import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { RECAP_MISSING, cleanupOldAudio, guardRecap, isMissingTable } from '@/lib/recap/server';
import { AUDIO_BUCKET, AUDIO_EXTS, MAX_AUDIO_BYTES, fileExt } from '@/lib/recap/types';

/** Danh sách cuộc họp: của mình (Admin: tất cả). */
export async function GET(req: NextRequest) {
  const g = await guardRecap(req);
  if ('res' in g) return g.res;
  let q = g.db
    .from('meeting_recaps')
    .select('id, user_email, title, audio_name, audio_size, duration_seconds, status, progress, error, created_at, updated_at, completed_at')
    .order('created_at', { ascending: false })
    .limit(300);
  if (!g.admin) q = q.ilike('user_email', g.staff.email.replace(/[\\%_]/g, m => `\\${m}`));
  const { data, error } = await q;
  if (error) return NextResponse.json({ meetings: [], error: isMissingTable(error.message) ? RECAP_MISSING : 'Không tải được danh sách.' });
  after(() => cleanupOldAudio(g.db));
  return NextResponse.json({ meetings: data, admin: g.admin, email: g.staff.email }, { headers: { 'Cache-Control': 'no-store' } });
}

const MIME: Record<string, string> = { mp3: 'audio/mp3', wav: 'audio/wav', m4a: 'audio/mp4', mp4: 'video/mp4', webm: 'video/webm' };

const createSchema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tên cuộc họp.').max(200),
  name: z.string().trim().min(1).max(300),
  size: z.number().int().positive(),
  duration: z.number().nonnegative().max(24 * 3600).nullable().optional()
});

/** Tạo cuộc họp + link tải file thẳng từ trình duyệt lên kho (không qua máy chủ, không bị giới hạn thời gian). */
export async function POST(req: NextRequest) {
  const g = await guardRecap(req);
  if ('res' in g) return g.res;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Thông tin chưa hợp lệ.' }, { status: 400 });
  const v = parsed.data;
  const ext = fileExt(v.name);
  if (!AUDIO_EXTS.includes(ext)) return NextResponse.json({ error: `Chỉ nhận file ${AUDIO_EXTS.map(e => '.' + e).join(', ')}.` }, { status: 400 });
  if (v.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: 'File vượt quá 500MB.' }, { status: 400 });

  const id = crypto.randomUUID();
  const path = `${id}.${ext}`;
  const { error } = await g.db.from('meeting_recaps').insert({
    id,
    user_id: g.staff.userId || null,
    user_email: g.staff.email,
    title: v.title,
    audio_path: path,
    audio_name: v.name,
    audio_size: v.size,
    audio_mime: MIME[ext],
    duration_seconds: v.duration ? Math.round(v.duration) : null,
    status: 'uploading'
  });
  if (error) return NextResponse.json({ error: isMissingTable(error.message) ? RECAP_MISSING : 'Không tạo được cuộc họp.' }, { status: 500 });
  const { data: signed, error: e2 } = await g.db.storage.from(AUDIO_BUCKET).createSignedUploadUrl(path);
  if (e2 || !signed) {
    await g.db.from('meeting_recaps').delete().eq('id', id);
    return NextResponse.json({ error: 'Kho file chưa sẵn sàng (cần chạy migration 20261204_meeting_recaps.sql).' }, { status: 500 });
  }
  return NextResponse.json({ id, uploadUrl: signed.signedUrl });
}
