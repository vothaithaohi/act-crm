'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bold,
  ExternalLink,
  Eye,
  GraduationCap,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Languages,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pencil,
  Plus,
  Quote,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { authedFetch } from '@/lib/supabase/authed-fetch';
import { ACADEMY_CATEGORIES, AcademyPost, academyCategoryLabel, academySlug, viHash } from '@/lib/dienvienvn/academy';
import { uploadPublicImage } from '@/components/dienvienvn/form-fields';
import { AcademyMarkdown } from '@/components/dienvienvn/academy-markdown';

const SITE = 'https://www.dienvienvn.com';
type ListRow = Pick<AcademyPost, 'id' | 'slug' | 'status' | 'category' | 'cover_url' | 'title' | 'excerpt' | 'title_en' | 'en_source_hash' | 'author' | 'published_at' | 'updated_at'> & {
  has_en: boolean;
  updated_by?: string | null;
};
type Form = Omit<AcademyPost, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'> & { id?: string };

const blank = (author: string): Form => ({
  slug: '',
  status: 'draft',
  category: ACADEMY_CATEGORIES[0].id,
  cover_url: null,
  title: '',
  excerpt: '',
  content: '',
  title_en: '',
  excerpt_en: '',
  content_en: '',
  en_source_hash: null,
  author,
  published_at: null
});
const trimmedVi = (f: Pick<Form, 'title' | 'excerpt' | 'content'>) => ({ title: f.title.trim(), excerpt: (f.excerpt || '').trim(), content: f.content.trim() });
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');

const inputCls = 'w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-black/10';
const labelCls = 'block text-xs font-semibold text-muted-foreground mb-1.5';

/** Mục "Academy · Blog" trong CRM: danh sách bài + soạn / sửa / đăng / dịch tiếng Anh. */
export function AcademyAdmin({ authorName }: { authorName: string }) {
  const [posts, setPosts] = useState<ListRow[] | null>(null);
  const [problem, setProblem] = useState('');
  const [editing, setEditing] = useState<Form | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await authedFetch('/api/admin/academy');
    const b = await res.json().catch(() => ({}));
    if (b.mode === 'demo') {
      setProblem('Chế độ demo chưa hỗ trợ blog Academy (cần kết nối Supabase).');
      return setPosts([]);
    }
    setProblem(b.error || '');
    setPosts(b.posts || []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const open = async (id: string) => {
    setOpening(id);
    try {
      const res = await authedFetch(`/api/admin/academy?id=${encodeURIComponent(id)}`);
      const b = await res.json().catch(() => ({}));
      if (!res.ok || !b.post) return void toast.error(b.error || 'Không mở được bài viết.');
      const p = b.post as AcademyPost;
      setEditing({ ...p, excerpt: p.excerpt || '', title_en: p.title_en || '', excerpt_en: p.excerpt_en || '', content_en: p.content_en || '' });
    } finally {
      setOpening(null);
    }
  };

  const remove = async (p: ListRow) => {
    if (!window.confirm(`Xoá bài "${p.title}"? Không hoàn tác được.`)) return;
    const res = await authedFetch(`/api/admin/academy?id=${encodeURIComponent(p.id)}`, { method: 'DELETE' });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) return void toast.error(b.error || 'Không xoá được.');
    toast.success('Đã xoá bài viết.');
    void load();
  };

  if (editing) {
    return (
      <AcademyEditor
        initial={editing}
        onClose={changed => {
          setEditing(null);
          if (changed) void load();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6" /> Academy · Blog
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Bài viết kiến thức hiện tại{' '}
            <a href={`${SITE}/academy`} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline underline-offset-2">
              dienvienvn.com/academy
            </a>{' '}
            (bản tiếng Anh tại /en/academy). Bài &ldquo;Nháp&rdquo; chỉ thấy trong CRM.
          </p>
        </div>
        <button
          onClick={() => setEditing(blank(authorName))}
          className="h-10 inline-flex items-center gap-2 px-4 rounded-xl bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold shrink-0"
        >
          <Plus className="w-4 h-4" /> Viết bài mới
        </button>
      </div>

      {problem && <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">{problem}</div>}

      {!posts ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        !problem && <p className="py-12 text-center text-sm text-muted-foreground">Chưa có bài viết nào. Bấm &ldquo;Viết bài mới&rdquo; để bắt đầu.</p>
      ) : (
        <ul className="rounded-2xl border bg-card divide-y">
          {posts.map(p => {
            return (
              <li key={p.id} className="flex items-center gap-4 p-4">
                <div className="w-20 h-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.cover_url && <img src={p.cover_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold ${p.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}
                    >
                      {p.status === 'published' ? `Đã đăng ${fmt(p.published_at)}` : 'Nháp'}
                    </span>
                    <span>{academyCategoryLabel(p.category)}</span>
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${p.has_en ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'}`}>
                      {p.has_en ? 'Có bản EN' : 'Chưa có bản EN'}
                    </span>
                    <span>Sửa {fmt(p.updated_at)}{p.updated_by ? ` · ${p.updated_by}` : ''}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {p.status === 'published' && (
                    <a
                      href={`${SITE}/academy/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Xem trên web"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => open(p.id)}
                    title="Sửa"
                    className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border text-xs font-semibold hover:bg-muted"
                  >
                    {opening === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />} Sửa
                  </button>
                  <button
                    onClick={() => remove(p)}
                    title="Xoá"
                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------------- Soạn bài ---------------- */

function AcademyEditor({ initial, onClose }: { initial: Form; onClose: (changed: boolean) => void }) {
  const [f, setF] = useState<Form>(initial);
  const [tab, setTab] = useState<'vi' | 'en'>('vi');
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [coverPct, setCoverPct] = useState<number | null>(null);
  const [changed, setChanged] = useState(false);
  const saved = useRef(JSON.stringify(initial));
  const set = (patch: Partial<Form>) => setF(x => ({ ...x, ...patch }));
  const dirty = JSON.stringify(f) !== saved.current;

  const hasEn = !!(f.title_en || '').trim();
  const enStale = hasEn && !!f.en_source_hash && f.en_source_hash !== 'manual' && f.en_source_hash !== viHash(trimmedVi(f));

  const close = () => {
    if (dirty && !window.confirm('Bài có thay đổi chưa lưu. Thoát không lưu?')) return;
    onClose(changed);
  };

  const save = async (status: Form['status'] = f.status) => {
    if (f.title.trim().length < 3) return void toast.error('Vui lòng nhập tiêu đề.');
    if (status === 'published' && !f.content.trim()) return void toast.error('Bài chưa có nội dung.');
    const slug = (f.slug || academySlug(f.title)).trim();
    setSaving(true);
    try {
      const res = await authedFetch('/api/admin/academy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, slug, status, excerpt: f.excerpt || null })
      });
      const b = await res.json().catch(() => ({}));
      if (b.mode === 'demo') return void toast.error('Chế độ demo không lưu được bài.');
      if (!res.ok || !b.post) return void toast.error(b.error || 'Không lưu được bài viết.');
      const p = b.post as AcademyPost;
      const next = { ...p, excerpt: p.excerpt || '', title_en: p.title_en || '', excerpt_en: p.excerpt_en || '', content_en: p.content_en || '' };
      setF(next);
      saved.current = JSON.stringify(next);
      setSlugTouched(true);
      setChanged(true);
      toast.success(status === 'published' ? (f.status === 'published' ? 'Đã lưu bài.' : 'Đã đăng bài lên dienvienvn.com/academy.') : 'Đã lưu nháp.');
    } finally {
      setSaving(false);
    }
  };

  const translate = async () => {
    const vi = trimmedVi(f);
    if (!vi.title) return void toast.error('Nhập tiêu đề tiếng Việt trước.');
    if (hasEn && !window.confirm('Thay bản tiếng Anh hiện tại bằng bản AI dịch mới?')) return;
    setTranslating(true);
    try {
      const res = await authedFetch('/api/admin/academy/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vi)
      });
      const b = await res.json().catch(() => ({}));
      if (b.mode === 'demo') return void toast.error('Chế độ demo không dịch được.');
      if (!res.ok || !b.title) return void toast.error(b.error || 'AI chưa dịch được.');
      set({ title_en: b.title, excerpt_en: b.excerpt, content_en: b.content, en_source_hash: b.source_hash });
      setTab('en');
      toast.success('AI đã dịch xong. Xem lại rồi bấm Lưu.');
    } catch {
      toast.error('Mất kết nối. Vui lòng thử lại.');
    } finally {
      setTranslating(false);
    }
  };

  const uploadCover = async (file: File) => {
    setCoverPct(0);
    try {
      set({ cover_url: await uploadPublicImage(file, 'academy', setCoverPct) });
    } catch (e) {
      toast.error((e as Error).message || 'Không tải được ảnh.');
    } finally {
      setCoverPct(null);
    }
  };

  const isPublished = f.status === 'published';
  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between gap-3">
        <button onClick={close} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" /> Đóng
        </button>
        {isPublished && f.slug && (
          <a href={`${SITE}/academy/${f.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold underline">
            <ExternalLink className="w-3.5 h-3.5" /> Xem trên web
          </a>
        )}
      </div>

      {/* Ảnh bìa */}
      <div className="rounded-2xl border bg-card p-4 md:p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
          <div>
            <span className={labelCls}>Ảnh bìa</span>
            <label className="relative flex aspect-[16/10] cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/40 hover:bg-muted">
              {f.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                  <ImagePlus className="w-5 h-5" /> Chọn ảnh (ngang 16:10)
                </span>
              )}
              {coverPct !== null && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-semibold text-white">Đang tải {coverPct}%</span>
              )}
              <input type="file" accept="image/*" className="sr-only" onChange={e => e.target.files?.[0] && uploadCover(e.target.files[0])} />
            </label>
            {f.cover_url && (
              <button onClick={() => set({ cover_url: null })} className="mt-1.5 text-xs text-muted-foreground hover:text-rose-600">
                Bỏ ảnh bìa
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 content-start">
            <div>
              <label className={labelCls}>Chuyên mục</label>
              <select className={inputCls} value={f.category} onChange={e => set({ category: e.target.value })}>
                {ACADEMY_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tác giả</label>
              <input className={inputCls} value={f.author || ''} onChange={e => set({ author: e.target.value })} placeholder="VD: ACT Academy" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Đường dẫn</label>
              <div className="flex items-center rounded-lg border bg-background text-sm">
                <span className="pl-3 text-muted-foreground whitespace-nowrap">dienvienvn.com/academy/</span>
                <input
                  className="h-10 min-w-0 flex-1 bg-transparent pr-3 focus:outline-none"
                  value={f.slug}
                  onChange={e => {
                    setSlugTouched(true);
                    set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-') });
                  }}
                  placeholder="tu-dong-theo-tieu-de"
                />
              </div>
              {isPublished && <p className="mt-1 text-[11px] text-amber-700">Bài đã đăng: đổi đường dẫn sẽ làm link cũ không mở được.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Tiếng Việt / English */}
      <div className="rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex rounded-full border p-1">
            {(
              [
                ['vi', 'Tiếng Việt (gốc)'],
                ['en', 'English']
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`h-8 px-4 rounded-full text-xs font-semibold ${tab === k ? 'bg-[#1d1d1f] text-white' : 'text-muted-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={translate}
            disabled={translating}
            className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border text-xs font-semibold hover:bg-muted disabled:opacity-60"
          >
            {translating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {translating ? 'AI đang dịch… (khoảng 1 phút)' : hasEn ? 'AI dịch lại sang tiếng Anh' : 'AI dịch sang tiếng Anh'}
          </button>
        </div>

        {tab === 'en' && enStale && (
          <p className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Bản tiếng Việt đã sửa sau khi dịch. Bấm &ldquo;AI dịch lại&rdquo; hoặc tự sửa bản tiếng Anh cho khớp.
          </p>
        )}
        {tab === 'en' && !hasEn && (
          <p className="mx-4 mt-4 flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <Languages className="w-4 h-4 shrink-0" /> Chưa có bản tiếng Anh: trang /en/academy sẽ hiện bản tiếng Việt. Bấm &ldquo;AI dịch sang tiếng Anh&rdquo; hoặc tự nhập.
          </p>
        )}

        <div className="p-4 md:p-5 space-y-4">
          {tab === 'vi' ? (
            <>
              <div>
                <label className={labelCls}>Tiêu đề *</label>
                <input
                  className={`${inputCls} !h-11 text-base font-semibold`}
                  value={f.title}
                  onChange={e => set({ title: e.target.value, ...(slugTouched ? {} : { slug: academySlug(e.target.value) }) })}
                  placeholder="VD: 5 lỗi thường gặp khi quay self-tape"
                />
              </div>
              <div>
                <label className={labelCls}>Mô tả ngắn (hiện ở danh sách bài và khi chia sẻ link)</label>
                <textarea className={`${inputCls} !h-20 py-2`} maxLength={400} value={f.excerpt || ''} onChange={e => set({ excerpt: e.target.value })} />
              </div>
              <MarkdownField label="Nội dung *" value={f.content} onChange={content => set({ content })} />
            </>
          ) : (
            <>
              <div>
                <label className={labelCls}>Title</label>
                <input
                  className={`${inputCls} !h-11 text-base font-semibold`}
                  value={f.title_en || ''}
                  onChange={e => set({ title_en: e.target.value, en_source_hash: f.en_source_hash || 'manual' })}
                />
              </div>
              <div>
                <label className={labelCls}>Excerpt</label>
                <textarea
                  className={`${inputCls} !h-20 py-2`}
                  maxLength={400}
                  value={f.excerpt_en || ''}
                  onChange={e => set({ excerpt_en: e.target.value, en_source_hash: f.en_source_hash || 'manual' })}
                />
              </div>
              <MarkdownField label="Content" value={f.content_en || ''} onChange={content_en => set({ content_en, en_source_hash: f.en_source_hash || 'manual' })} />
            </>
          )}
        </div>
      </div>

      {/* Thanh lưu dính dưới */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur md:left-64">
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 md:px-8">
          <span className="mr-auto text-xs text-muted-foreground">
            {isPublished ? `Đang hiện trên web · đăng ${fmt(f.published_at)}` : 'Nháp · chưa hiện trên web'}
            {dirty ? ' · có thay đổi chưa lưu' : ''}
          </span>
          {isPublished ? (
            <>
              <button onClick={() => save('draft')} disabled={saving} className="h-10 px-4 rounded-xl border text-xs font-semibold hover:bg-muted disabled:opacity-50">
                Gỡ khỏi web (về nháp)
              </button>
              <button onClick={() => save('published')} disabled={saving} className="h-10 inline-flex items-center gap-2 px-5 rounded-xl bg-[#1d1d1f] text-white text-xs font-semibold disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Lưu thay đổi
              </button>
            </>
          ) : (
            <>
              <button onClick={() => save('draft')} disabled={saving} className="h-10 px-4 rounded-xl border text-xs font-semibold hover:bg-muted disabled:opacity-50">
                Lưu nháp
              </button>
              <button onClick={() => save('published')} disabled={saving} className="h-10 inline-flex items-center gap-2 px-5 rounded-xl bg-[#1d1d1f] text-white text-xs font-semibold disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Đăng bài
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Ô soạn nội dung: thanh công cụ (tiêu đề, in đậm, danh sách, link, chèn ảnh) + Xem trước. Lưu dạng Markdown. */
function MarkdownField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);

  /** Bọc / chèn quanh đoạn đang chọn rồi đặt lại con trỏ. */
  const apply = (fn: (sel: string) => { text: string; cursor?: number }, linePrefix = false) => {
    const el = ref.current;
    if (!el) return;
    let start = el.selectionStart;
    const end = el.selectionEnd;
    if (linePrefix) start = value.lastIndexOf('\n', start - 1) + 1;
    const { text, cursor } = fn(value.slice(start, end));
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + (cursor ?? text.length);
      el.setSelectionRange(pos, pos);
    });
  };
  const wrap = (mark: string, placeholder: string) => apply(sel => ({ text: `${mark}${sel || placeholder}${mark}`, cursor: mark.length + (sel || placeholder).length + mark.length }));
  const prefix = (p: string) => apply(sel => ({ text: (sel || '').split('\n').map((l, i) => p.replace('1.', `${i + 1}.`) + l).join('\n') }), true);
  const block = (s: string) => apply(() => ({ text: `\n\n${s}\n\n` }));

  const insertImage = async (file: File) => {
    setUploading(0);
    try {
      const url = await uploadPublicImage(file, 'academy', setUploading);
      block(`![${file.name.replace(/\.[^.]+$/, '')}](${url})`);
    } catch (e) {
      toast.error((e as Error).message || 'Không tải được ảnh.');
    } finally {
      setUploading(null);
    }
  };

  const Btn = ({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" title={title} aria-label={title} onClick={onClick} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
      {children}
    </button>
  );

  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <label className={labelCls}>{label}</label>
        <button type="button" onClick={() => setPreview(v => !v)} className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
          {preview ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {preview ? 'Soạn' : 'Xem trước'}
        </button>
      </div>
      <div className="rounded-xl border bg-background">
        {!preview && (
          <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1">
            <Btn title="Tiêu đề lớn" onClick={() => prefix('## ')}>
              <Heading2 className="w-4 h-4" />
            </Btn>
            <Btn title="Tiêu đề nhỏ" onClick={() => prefix('### ')}>
              <Heading3 className="w-4 h-4" />
            </Btn>
            <Btn title="In đậm" onClick={() => wrap('**', 'chữ đậm')}>
              <Bold className="w-4 h-4" />
            </Btn>
            <Btn title="In nghiêng" onClick={() => wrap('*', 'chữ nghiêng')}>
              <Italic className="w-4 h-4" />
            </Btn>
            <Btn title="Danh sách chấm" onClick={() => prefix('- ')}>
              <List className="w-4 h-4" />
            </Btn>
            <Btn title="Danh sách số" onClick={() => prefix('1. ')}>
              <ListOrdered className="w-4 h-4" />
            </Btn>
            <Btn title="Trích dẫn" onClick={() => prefix('> ')}>
              <Quote className="w-4 h-4" />
            </Btn>
            <Btn
              title="Chèn link"
              onClick={() => {
                const url = window.prompt('Dán link (https://…)');
                if (url) apply(sel => ({ text: `[${sel || 'chữ hiển thị'}](${url.trim()})` }));
              }}
            >
              <Link2 className="w-4 h-4" />
            </Btn>
            <label title="Chèn ảnh" className="h-8 w-8 inline-flex cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
              {uploading !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              <input type="file" accept="image/*" className="sr-only" onChange={e => e.target.files?.[0] && insertImage(e.target.files[0])} />
            </label>
            <span className="ml-auto pr-1 text-[11px] text-muted-foreground">Bôi đen chữ rồi bấm nút để định dạng</span>
          </div>
        )}
        {preview ? (
          <div className="min-h-[420px] p-5 md:p-8">
            {value.trim() ? <AcademyMarkdown content={value} className="max-w-[680px]" /> : <p className="text-sm text-muted-foreground">Chưa có nội dung.</p>}
          </div>
        ) : (
          <textarea
            ref={ref}
            value={value}
            onChange={e => onChange(e.target.value)}
            className="block min-h-[420px] w-full resize-y rounded-b-xl bg-transparent p-4 font-mono text-[13px] leading-6 focus:outline-none"
            placeholder={'Viết nội dung bài ở đây.\n\nCách xuống dòng: để trống 1 dòng giữa hai đoạn.\n## Tiêu đề mục\n- Ý thứ nhất\n- Ý thứ hai'}
          />
        )}
      </div>
    </div>
  );
}
