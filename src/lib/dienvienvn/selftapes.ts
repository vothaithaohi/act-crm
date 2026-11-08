// Thư viện self-tape của diễn viên: thêm tuỳ ý, chọn tối đa 3 video nổi bật hiện trên trang hồ sơ công khai.
// Khi ứng tuyển, diễn viên tick các self-tape phù hợp với dự án.
import { z } from 'zod';

export interface SelfTape {
  url: string;
  title: string;
  highlight: boolean;
}

export const MAX_SELFTAPES = 30;
export const MAX_HIGHLIGHTS = 3;

export const selfTapeUrl = z
  .string()
  .trim()
  .max(500)
  .regex(/^https?:\/\/\S+\.\S+/i, 'Link self-tape cần bắt đầu bằng https://');

export const selfTapesSchema = z
  .array(z.object({ url: selfTapeUrl, title: z.string().trim().max(120).optional().default(''), highlight: z.boolean().optional().default(false) }))
  .max(MAX_SELFTAPES, `Tối đa ${MAX_SELFTAPES} self-tape`)
  .refine(list => list.filter(x => x.highlight).length <= MAX_HIGHLIGHTS, `Chỉ chọn tối đa ${MAX_HIGHLIGHTS} self-tape nổi bật`);

/** Dữ liệu cũ / lỗi → danh sách sạch. */
export function cleanSelfTapes(v: unknown): SelfTape[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(x => x && typeof x.url === 'string' && x.url.trim())
    .map(x => ({ url: String(x.url).trim(), title: String(x.title || '').trim(), highlight: !!x.highlight }));
}

/** Mã video YouTube (youtu.be / watch?v= / shorts / embed) để nhúng; không phải YouTube → null. */
export function youtubeId(url: string): string | null {
  const m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/i.exec(url);
  return m ? m[1] : null;
}
