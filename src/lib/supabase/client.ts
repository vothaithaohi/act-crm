import { createBrowserClient } from '@supabase/ssr';
import { previewGuardedFetch } from './preview-lock';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  // Super Admin đang "xem với vai trò…": chặn ghi dữ liệu (xem preview-lock.ts)
  return createBrowserClient(supabaseUrl, supabaseAnonKey, { global: { fetch: previewGuardedFetch } });
}
