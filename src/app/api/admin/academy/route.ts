import { NextRequest, NextResponse } from 'next/server';
import { guardPartnerAdmin } from '@/lib/dienvienvn/partner-admin';
import { ACADEMY_MISSING, academyInputSchema } from '@/lib/dienvienvn/academy';

// Academy (blog kiến thức): Admin viết / sửa / đăng / xoá bài trong CRM. Đọc ghi bằng quyền máy chủ.
const ROLES = ['super_admin'];
const missing = (m?: string) => /academy_posts|schema cache/i.test(m || '');

/** ?id= : 1 bài đầy đủ; không có id: danh sách (không kèm nội dung). */
export async function GET(req: NextRequest) {
  const g = await guardPartnerAdmin(req, ROLES);
  if ('res' in g) return g.res;
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const { data, error } = await g.db.from('academy_posts').select('*').eq('id', id).maybeSingle();
    if (error) return NextResponse.json({ error: missing(error.message) ? ACADEMY_MISSING : 'Không tải được bài viết.' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Không tìm thấy bài viết.' }, { status: 404 });
    return NextResponse.json({ post: data }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const { data, error } = await g.db
    .from('academy_posts')
    .select('id, slug, status, category, cover_url, title, excerpt, title_en, content_en, en_source_hash, author, published_at, updated_by, updated_at, created_at')
    .order('updated_at', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ posts: [], error: missing(error.message) ? ACADEMY_MISSING : 'Không tải được danh sách bài.' });
  // Danh sách chỉ cần biết đã có bản tiếng Anh chưa
  const posts = (data || []).map(({ content_en, ...p }) => ({ ...p, has_en: !!(p.title_en && content_en) }));
  return NextResponse.json({ posts }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Tạo / cập nhật bài. Đăng lần đầu mà chưa có ngày đăng → lấy giờ hiện tại. */
export async function POST(req: NextRequest) {
  const g = await guardPartnerAdmin(req, ROLES);
  if ('res' in g) return g.res;
  const parsed = academyInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Thông tin bài viết chưa hợp lệ.' }, { status: 400 });
  const { id, ...v } = parsed.data;
  const now = new Date().toISOString();
  const row = {
    ...v,
    cover_url: v.cover_url || null,
    excerpt: v.excerpt || null,
    title_en: v.title_en || null,
    excerpt_en: v.excerpt_en || null,
    content_en: v.content_en || null,
    author: v.author || null,
    published_at: v.status === 'published' ? v.published_at || now : v.published_at || null,
    updated_by: g.staff.email,
    updated_at: now
  };
  const { data, error } = id
    ? await g.db.from('academy_posts').update(row).eq('id', id).select('*').maybeSingle()
    : await g.db.from('academy_posts').insert({ ...row, created_by: g.staff.email }).select('*').single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Đường dẫn này đã có bài khác dùng. Hãy đổi đường dẫn.' }, { status: 409 });
    return NextResponse.json({ error: missing(error.message) ? ACADEMY_MISSING : 'Không lưu được bài viết.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Không tìm thấy bài viết.' }, { status: 404 });
  return NextResponse.json({ post: data });
}

export async function DELETE(req: NextRequest) {
  const g = await guardPartnerAdmin(req, ROLES);
  if ('res' in g) return g.res;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Thiếu mã bài viết.' }, { status: 400 });
  const { error } = await g.db.from('academy_posts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: missing(error.message) ? ACADEMY_MISSING : 'Không xoá được bài viết.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
