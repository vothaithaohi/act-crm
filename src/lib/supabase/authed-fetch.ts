import { createClient } from '@/lib/supabase/client';
import { previewGuardedFetch } from '@/lib/supabase/preview-lock';

/** fetch kèm access token Supabase của nhân sự đang đăng nhập (dùng cho API nội bộ CRM). */
export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const supabase = createClient();
  const headers = new Headers(init.headers);
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }
  return previewGuardedFetch(input, { ...init, headers });
}
