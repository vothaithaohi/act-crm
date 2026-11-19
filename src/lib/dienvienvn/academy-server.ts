import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { getServiceDb } from '@/lib/projects/server';
import { AI_MODEL } from './ai-talent';
import { AcademyPost } from './academy';

const PUBLIC_COLUMNS = 'id, slug, status, category, cover_url, title, excerpt, content, title_en, excerpt_en, content_en, en_source_hash, author, published_at, updated_at';
const LIST_COLUMNS = 'id, slug, status, category, cover_url, title, excerpt, title_en, excerpt_en, author, published_at, updated_at';

/** Bài đã đăng (mới nhất trước) cho trang /academy. Lỗi / chưa có bảng → danh sách rỗng. */
export async function listPublishedPosts(limit = 100): Promise<AcademyPost[]> {
  const { db } = getServiceDb();
  if (!db) return [];
  const { data, error } = await db
    .from('academy_posts')
    .select(LIST_COLUMNS)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []).map(p => ({ ...p, content: '', content_en: null, en_source_hash: null }) as AcademyPost);
}

/** Một bài đã đăng theo đường dẫn. */
export async function getPublishedPost(slug: string): Promise<AcademyPost | null> {
  const { db } = getServiceDb();
  if (!db || !/^[a-z0-9][a-z0-9-]{1,118}$/.test(slug)) return null;
  const { data } = await db
    .from('academy_posts')
    .select(PUBLIC_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .maybeSingle();
  return (data as AcademyPost) || null;
}

/** Bản hiển thị theo ngôn ngữ: /en dùng bản tiếng Anh nếu đã có, chưa có thì giữ tiếng Việt. */
export function localizedPost(p: AcademyPost, lang: 'vi' | 'en') {
  const en = lang === 'en' && !!p.title_en?.trim() && (!!p.content_en?.trim() || !p.content.trim());
  return {
    title: en ? (p.title_en as string) : p.title,
    excerpt: en ? p.excerpt_en || null : p.excerpt,
    content: en ? p.content_en || '' : p.content,
    isEnglish: en
  };
}

export const TRANSLATE_KEY_MISSING = 'Chưa cấu hình ANTHROPIC_API_KEY trên Vercel nên chưa dịch tự động được. Bạn vẫn có thể tự nhập bản tiếng Anh.';

const TRANSLATE_TOOL: Anthropic.Tool = {
  name: 'save_translation',
  description: 'Lưu bản dịch tiếng Anh của bài viết.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string', description: 'Tiêu đề tiếng Anh' },
      excerpt: { type: 'string', description: 'Mô tả ngắn tiếng Anh (rỗng nếu bản gốc rỗng)' },
      content: { type: 'string', description: 'Nội dung tiếng Anh, giữ nguyên định dạng Markdown' }
    },
    required: ['title', 'excerpt', 'content']
  }
};

/** AI dịch bài sang tiếng Anh (giữ Markdown, link, ảnh; tên riêng giữ nguyên). */
export async function translatePost(input: { title: string; excerpt: string; content: string }) {
  const client = new Anthropic({ timeout: 240_000, maxRetries: 1 });
  const res = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 32000,
    system:
      'Bạn là biên dịch viên Việt – Anh cho DienVienVN, nền tảng casting diễn viên tại Việt Nam. Dịch bài blog kiến thức diễn xuất sang tiếng Anh tự nhiên, chuyên nghiệp, đúng thuật ngữ điện ảnh. ' +
      'Giữ nguyên định dạng Markdown (tiêu đề, danh sách, in đậm, trích dẫn), link và ảnh (chỉ dịch phần chữ hiển thị). Giữ nguyên tên người, tên phim, tên thương hiệu (DienVienVN, ACT Academy). ' +
      'Không thêm, bớt hay bình luận nội dung. Gọi công cụ save_translation đúng 1 lần.',
    tools: [TRANSLATE_TOOL],
    tool_choice: { type: 'tool', name: 'save_translation' },
    messages: [
      {
        role: 'user',
        content: `Dịch bài sau sang tiếng Anh.\n\n<title>\n${input.title}\n</title>\n\n<excerpt>\n${input.excerpt}\n</excerpt>\n\n<content>\n${input.content}\n</content>`
      }
    ]
  });
  const call = res.content.find(b => b.type === 'tool_use');
  if (!call || call.type !== 'tool_use') throw new Error('AI chưa trả bản dịch. Vui lòng thử lại.');
  if (res.stop_reason === 'max_tokens') throw new Error('Bài quá dài để dịch một lần. Hãy rút gọn hoặc tự nhập bản tiếng Anh.');
  const out = call.input as { title: string; excerpt: string; content: string };
  return { title: out.title.trim(), excerpt: out.excerpt.trim(), content: out.content.trim() };
}
