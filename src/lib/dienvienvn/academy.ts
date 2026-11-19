import { z } from 'zod';
import { slugifyVi } from '@/lib/projects/types';

// Academy: blog kiến thức trên dienvienvn.com/academy (Admin viết trong CRM, có bản tiếng Anh do AI dịch).

export type AcademyStatus = 'draft' | 'published';

export interface AcademyPost {
  id: string;
  slug: string;
  status: AcademyStatus;
  category: string;
  cover_url: string | null;
  title: string;
  excerpt: string | null;
  content: string;
  title_en: string | null;
  excerpt_en: string | null;
  content_en: string | null;
  /** Dấu vân tay của bản tiếng Việt lúc dịch: khác bản hiện tại → bản tiếng Anh đã cũ */
  en_source_hash: string | null;
  author: string | null;
  published_at: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const ACADEMY_CATEGORIES: { id: string; label: string }[] = [
  { id: 'kien-thuc', label: 'Kiến thức diễn xuất' },
  { id: 'self-tape', label: 'Self-tape & casting' },
  { id: 'nghe-dien', label: 'Nghề diễn viên' },
  { id: 'tin-tuc', label: 'Tin tức' }
];
export const academyCategoryLabel = (id: string) => ACADEMY_CATEGORIES.find(c => c.id === id)?.label || 'Kiến thức diễn xuất';

export const ACADEMY_MISSING = 'Chưa có bảng bài viết. Hãy chạy migration 20261201_academy_blog.sql trong Supabase.';

/** Đường dẫn bài từ tiêu đề: "Cách quay self-tape" → cach-quay-self-tape */
export const academySlug = (title: string) => slugifyVi(title).slice(0, 100).replace(/-+$/g, '');

/** Dấu vân tay ngắn của bản tiếng Việt (để biết bản dịch còn khớp không). */
export function viHash(p: Pick<AcademyPost, 'title' | 'excerpt' | 'content'>): string {
  const s = `${p.title}\u0000${p.excerpt || ''}\u0000${p.content}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return `${s.length}-${h.toString(36)}`;
}

/** Thời gian đọc (phút), ~220 chữ / phút. */
export const readingMinutes = (content: string) => Math.max(1, Math.round((content.trim().split(/\s+/).filter(Boolean).length || 0) / 220));

const text = (max: number) => z.string().trim().max(max);
export const academyInputSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,118}$/, 'Đường dẫn chỉ gồm chữ thường không dấu, số và dấu "-" (2–119 ký tự).'),
  status: z.enum(['draft', 'published']),
  category: z.string().refine(v => ACADEMY_CATEGORIES.some(c => c.id === v), 'Chuyên mục chưa đúng.'),
  cover_url: z.string().trim().url('Ảnh bìa chưa đúng.').max(1000).nullable().optional(),
  title: text(200).min(3, 'Vui lòng nhập tiêu đề (ít nhất 3 ký tự).'),
  excerpt: text(400).nullable().optional(),
  content: text(100_000),
  title_en: text(200).nullable().optional(),
  excerpt_en: text(400).nullable().optional(),
  content_en: text(100_000).nullable().optional(),
  en_source_hash: z.string().max(64).nullable().optional(),
  author: text(120).nullable().optional(),
  published_at: z.string().datetime({ offset: true }).nullable().optional()
});
export type AcademyInput = z.infer<typeof academyInputSchema>;
