import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { CastingProject, matchesProjectSlug } from './types';

/**
 * Client Supabase quyền service role cho API công khai (bỏ qua RLS, chỉ chạy trên server).
 * - 'demo': chưa cấu hình Supabase → trình duyệt tự xử lý bằng dữ liệu cục bộ.
 * - 'misconfigured': có URL nhưng thiếu SUPABASE_SERVICE_ROLE_KEY → báo lỗi cấu hình.
 */
export function getServiceDb(): { mode: 'live'; db: SupabaseClient } | { mode: 'demo' | 'misconfigured'; db: null } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) return { mode: 'demo', db: null };
  if (!key) return { mode: 'misconfigured', db: null };
  return { mode: 'live', db: createSupabaseClient(url, key, { auth: { persistSession: false } }) };
}

export const MISCONFIGURED_MESSAGE = 'Máy chủ chưa cấu hình SUPABASE_SERVICE_ROLE_KEY. Vui lòng liên hệ quản trị viên.';

/**
 * Dự án (không phải bản nháp) theo UUID hoặc đường dẫn dễ đọc (VD: "mot-phim-linh-dinh-dv-01", "dv-01").
 * Trả 'error' khi lỗi database.
 */
export async function findProjectByParam(db: SupabaseClient, param: string): Promise<CastingProject | null | 'error'> {
  const key = decodeURIComponent(param).trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
    const { data, error } = await db.from('casting_projects').select('*').eq('id', key).neq('status', 'draft').maybeSingle();
    if (error) return 'error';
    return (data as CastingProject | null) || null;
  }
  if (!/^[a-z0-9-]{1,100}$/i.test(key)) return null;
  const { data: rows, error } = await db.from('casting_projects').select('id, code, title, hide_title').neq('status', 'draft');
  if (error) return 'error';
  const hit = ((rows || []) as Pick<CastingProject, 'id' | 'code' | 'title' | 'hide_title'>[]).find(p => matchesProjectSlug(key, p));
  if (!hit) return null;
  const { data, error: fullErr } = await db.from('casting_projects').select('*').eq('id', hit.id).maybeSingle();
  if (fullErr) return 'error';
  return (data as CastingProject | null) || null;
}
