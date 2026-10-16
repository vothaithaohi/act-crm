import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

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
