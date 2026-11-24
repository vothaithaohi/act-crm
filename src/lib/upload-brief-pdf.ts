'use client';

import { createClient } from '@/lib/supabase/client';
import { authedFetch } from '@/lib/supabase/authed-fetch';

/** Tải file PDF gốc lên kho công khai (để diễn viên tải về in). Trả link công khai, hoặc null nếu chưa tải được. */
export async function uploadBriefPdf(file: File): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null; // chế độ demo
  const res = await authedFetch('/api/admin/brief-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name, size: file.size })
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok || !b.token) throw new Error(b.error || 'Không tải được file PDF lên.');
  const { error } = await supabase.storage.from(b.bucket).uploadToSignedUrl(b.path, b.token, file, { contentType: 'application/pdf' });
  if (error) throw new Error('Không tải được file PDF lên. Vui lòng thử lại.');
  return b.url as string;
}
