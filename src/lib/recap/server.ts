import 'server-only';
import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireStaffRole, StaffIdentity } from '@/lib/supabase/auth-guard';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { USER_ROLES } from '@/lib/types/crm';
import { AI_MISSING, AiFile, getRecapAI } from './ai';
import { AUDIO_BUCKET, AUDIO_KEEP_DAYS, CHUNK_SECONDS, Meeting, Segment, transcriptText } from './types';

export const RECAP_MISSING = 'Chưa có bảng Recap. Hãy chạy migration 20261204_meeting_recaps.sql trên Supabase.';
export const isMissingTable = (m?: string) => /meeting_recaps|schema cache|does not exist/i.test(m || '');
const ADMIN_ROLES = ['super_admin', 'admin'];

/** Nhân sự CRM đang hoạt động. Admin xem được mọi cuộc họp, người khác chỉ cuộc họp của mình. */
export async function guardRecap(req: NextRequest): Promise<{ res: NextResponse } | { staff: StaffIdentity; db: SupabaseClient; admin: boolean }> {
  const staff = await requireStaffRole(req, [...USER_ROLES, 'admin']);
  if (staff instanceof NextResponse) return { res: staff };
  const { mode, db } = getServiceDb();
  if (mode === 'demo' || !staff) return { res: NextResponse.json({ mode: 'demo', error: 'Chế độ demo chưa kết nối Supabase.' }, { status: 400 }) };
  if (!db) return { res: NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 }) };
  return { staff, db, admin: ADMIN_ROLES.includes(staff.role) };
}

export async function loadOwned(db: SupabaseClient, id: string, staff: StaffIdentity, admin: boolean): Promise<Meeting | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db.from('meeting_recaps').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  if (!admin && (data.user_email || '').toLowerCase() !== staff.email.toLowerCase()) return null;
  return data as Meeting;
}

/** Khoá ký nội bộ để máy chủ tự gọi bước xử lý tiếp theo (không cần thêm biến môi trường). */
export function processSecret(): string {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev').update('recap-process').digest('hex');
}

/** Gọi bước xử lý tiếp theo ở một lượt chạy máy chủ mới (mỗi lượt tối đa 5 phút). */
export async function chain(origin: string, id: string) {
  try {
    await fetch(`${origin}/api/recap/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-recap-secret': processSecret() },
      body: JSON.stringify({ id }),
      signal: AbortSignal.timeout(15_000)
    });
  } catch (e) {
    console.error('[recap] Không gọi được bước tiếp theo:', e);
  }
}

/** Xoá file ghi âm quá 30 ngày (chỉ giữ chữ). */
export async function cleanupOldAudio(db: SupabaseClient) {
  const before = new Date(Date.now() - AUDIO_KEEP_DAYS * 86400_000).toISOString();
  const { data } = await db.from('meeting_recaps').select('id, audio_path').not('audio_path', 'is', null).lt('created_at', before).limit(50);
  if (!data?.length) return;
  await db.storage.from(AUDIO_BUCKET).remove(data.map(r => r.audio_path as string));
  await db.from('meeting_recaps').update({ audio_path: null }).in('id', data.map(r => r.id));
}

const MAX_ATTEMPTS = 3;
const LOCK_MS = 6 * 60_000;

/**
 * Chạy 1 bước của cuộc họp: tải file sang AI → bóc băng từng đoạn 20 phút → tóm tắt.
 * Trả true nếu còn bước tiếp theo.
 */
export async function advance(db: SupabaseClient, id: string): Promise<boolean> {
  const now = new Date();
  // Giành quyền xử lý (tránh 2 lượt chạy cùng lúc)
  const { data: claimed } = await db
    .from('meeting_recaps')
    .update({ lock_until: new Date(now.getTime() + LOCK_MS).toISOString() })
    .eq('id', id)
    .in('status', ['transcribing', 'summarizing'])
    .or(`lock_until.is.null,lock_until.lt."${now.toISOString()}"`)
    .select('*');
  const m = claimed?.[0] as (Meeting & { ai_file: string | null; ai_file_uri: string | null; attempts: number }) | undefined;
  if (!m) return false;

  const save = (patch: Record<string, unknown>) =>
    db.from('meeting_recaps').update({ ...patch, lock_until: null, updated_at: new Date().toISOString() }).eq('id', id);

  const ai = getRecapAI();
  if (!ai) {
    await save({ status: 'failed', error: AI_MISSING });
    return false;
  }

  try {
    const file: AiFile | null = m.ai_file && m.ai_file_uri ? { name: m.ai_file, uri: m.ai_file_uri, mime: m.audio_mime || 'audio/mpeg' } : null;

    if (m.status === 'transcribing' && !file) {
      if (!m.audio_path || !m.audio_size) throw new Error('Không còn file ghi âm gốc.');
      const { data: signed } = await db.storage.from(AUDIO_BUCKET).createSignedUrl(m.audio_path, 3600);
      if (!signed?.signedUrl) throw new Error('Không đọc được file ghi âm trong kho.');
      const f = await ai.upload({
        size: m.audio_size,
        mime: m.audio_mime || 'audio/mpeg',
        name: m.title,
        read: async (start, end) => {
          const r = await fetch(signed.signedUrl, { headers: { Range: `bytes=${start}-${end - 1}` } });
          if (!r.ok) throw new Error(`Không đọc được file ghi âm (${r.status}).`);
          return r.arrayBuffer();
        }
      });
      await save({ ai_file: f.name, ai_file_uri: f.uri, audio_mime: f.mime, progress: { ...m.progress, stage: 'ready' }, attempts: 0 });
      return true;
    }

    if (m.status === 'transcribing' && file) {
      try {
        await ai.waitReady(file);
      } catch (e) {
        // File trên Gemini hết hạn (48 giờ) → tải lại
        if ((e as Error).message === 'FILE_GONE') {
          await save({ ai_file: null, ai_file_uri: null });
          return true;
        }
        throw e;
      }
      const dur = m.duration_seconds || 0;
      const total = dur > 0 ? Math.max(1, Math.ceil(dur / CHUNK_SECONDS)) : 1;
      const done = Math.min(m.progress?.done || 0, total);
      const from = done * CHUNK_SECONDS;
      const to = total === 1 ? null : Math.min(dur, from + CHUNK_SECONDS);
      const known = (m.progress as { known?: { id: string; description: string }[] })?.known || [];
      const r = await ai.transcribe(file, { from, to, knownSpeakers: known });
      // Đoạn sau: bỏ các câu AI lỡ chép lại từ đoạn trước
      const kept = r.segments.filter(s => total === 1 || done === 0 || s.t >= from - 5);
      const segments: Segment[] = [...(done === 0 ? [] : m.segments || []), ...kept].sort((a, b) => a.t - b.t);
      const knownMap = new Map(known.map(k => [k.id, k]));
      for (const s of r.speakers) if (!knownMap.has(s.id.toUpperCase())) knownMap.set(s.id.toUpperCase(), { id: s.id.toUpperCase(), description: s.description });
      const finished = done + 1 >= total;
      await save({
        segments,
        progress: { done: done + 1, total, known: Array.from(knownMap.values()), stage: finished ? 'summarizing' : 'transcribing' },
        attempts: 0,
        ...(finished ? { status: 'summarizing' } : {})
      });
      return true;
    }

    if (m.status === 'summarizing') {
      const text = transcriptText(m.segments || [], m.speakers || {});
      const recap = text.trim() ? await ai.summarize(m.title, text) : '## Tóm tắt tổng quan\nKhông nhận diện được lời nói trong file ghi âm.';
      await save({ recap_markdown: recap, status: 'completed', completed_at: new Date().toISOString(), ai_provider_used: `gemini:${ai.label}`, attempts: 0, error: null });
      if (file) await ai.remove(file);
      await db.from('meeting_recaps').update({ ai_file: null, ai_file_uri: null }).eq('id', id);
      return false;
    }
    return false;
  } catch (e) {
    const msg = (e as Error).name === 'AbortError' ? 'AI xử lý quá thời gian.' : (e as Error).message || 'Lỗi không xác định.';
    console.error('[recap] Lỗi xử lý', id, msg);
    const attempts = (m.attempts || 0) + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await save({ status: 'failed', error: msg.slice(0, 500), attempts });
      return false;
    }
    await save({ attempts, error: msg.slice(0, 500) });
    return true;
  }
}
