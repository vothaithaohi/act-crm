import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ACADEMY_CATEGORIES, AcademyPost, academyCategoryLabel, readingMinutes } from '@/lib/dienvienvn/academy';
import { localizedPost } from '@/lib/dienvienvn/academy-server';
import { AcademyMarkdown } from './academy-markdown';
import { GlobalNav, SiteFooter } from './site-chrome';

// Trang Academy trên dienvienvn.com (máy chủ dựng sẵn để Google đọc được).
type Ctx = { base: string; lang: 'vi' | 'en'; tr: (s: string) => string };

const dateText = (iso: string | null, lang: 'vi' | 'en') =>
  iso ? new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'vi-VN', { day: 'numeric', month: lang === 'en' ? 'short' : '2-digit', year: 'numeric' }) : '';

/** /academy: danh sách bài, lọc theo chuyên mục (?c=). */
export function AcademyList({ posts, category, ctx }: { posts: AcademyPost[]; category: string; ctx: Ctx }) {
  const { base, lang, tr } = ctx;
  const shown = category ? posts.filter(p => p.category === category) : posts;
  const [lead, ...rest] = shown;
  const card = (p: AcademyPost, big = false) => {
    const t = localizedPost(p, lang);
    return (
      <Link key={p.id} href={`${base}/academy/${p.slug}`} className="group block">
        <div className={`overflow-hidden rounded-[18px] bg-[#f5f5f7] ${big ? 'aspect-[16/9]' : 'aspect-[16/10]'}`}>
          {p.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.cover_url} alt="" loading={big ? 'eager' : 'lazy'} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          )}
        </div>
        <p className="mt-4 text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">
          {tr(academyCategoryLabel(p.category))} · {dateText(p.published_at, lang)}
        </p>
        <h2 className={`dv-display mt-1.5 font-semibold leading-[1.2] group-hover:underline ${big ? 'text-[30px] md:text-[36px]' : 'text-[22px]'}`}>{t.title}</h2>
        {t.excerpt && <p className={`mt-2 line-clamp-3 leading-[1.5] text-[var(--dv-text-secondary)] ${big ? 'text-[18px]' : 'text-[15px]'}`}>{t.excerpt}</p>}
      </Link>
    );
  };
  return (
    <>
      <GlobalNav />
      <main className="bg-white pb-20">
        <div className="mx-auto max-w-[1080px] px-4 pt-10 md:px-6 md:pt-16">
          <h1 className="dv-display dv-headline">{tr('Academy.')}</h1>
          <p className="dv-subhead mt-3 max-w-[640px] text-[var(--dv-text-secondary)]">
            {tr('Kiến thức diễn xuất, casting và nghề diễn viên từ đội ngũ ACT Academy.')}
          </p>
          <nav className="dv-scroll-x -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label={tr('Chuyên mục')}>
            {[{ id: '', label: 'Tất cả' }, ...ACADEMY_CATEGORIES].map(c => (
              <Link
                key={c.id}
                href={c.id ? `${base}/academy?c=${c.id}` : `${base}/academy`}
                aria-current={category === c.id ? 'page' : undefined}
                className={`dv-chip shrink-0 ${category === c.id ? '!border-[#1d1d1f] !bg-[#1d1d1f] !text-white' : ''}`}
              >
                {tr(c.label)}
              </Link>
            ))}
          </nav>

          {!lead ? (
            <p className="py-20 text-center text-[17px] text-[var(--dv-text-secondary)]">{tr('Chưa có bài viết. Các bài mới sẽ sớm xuất hiện tại đây.')}</p>
          ) : (
            <>
              <div className="mt-10">{card(lead, true)}</div>
              {rest.length > 0 && <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{rest.map(p => card(p))}</div>}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/** /academy/[slug]: một bài. */
export function AcademyArticle({ post, related, ctx }: { post: AcademyPost; related: AcademyPost[]; ctx: Ctx }) {
  const { base, lang, tr } = ctx;
  const t = localizedPost(post, lang);
  return (
    <>
      <GlobalNav />
      <main className="bg-white pb-20">
        <article className="mx-auto max-w-[720px] px-4 pt-8 md:px-6 md:pt-12">
          <Link href={`${base}/academy`} className="inline-flex items-center gap-1.5 text-[15px] text-[var(--dv-text-secondary)] hover:text-[var(--dv-text)]">
            <ArrowLeft className="h-4 w-4" /> {tr('Academy')}
          </Link>
          <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">{tr(academyCategoryLabel(post.category))}</p>
          <h1 className="dv-display mt-2 text-[34px] font-semibold leading-[1.15] tracking-[-0.02em] md:text-[44px]">{t.title}</h1>
          {t.excerpt && <p className="mt-4 text-[20px] leading-[1.5] text-[var(--dv-text-secondary)]">{t.excerpt}</p>}
          <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-[var(--dv-text-secondary)]">
            {post.author && <span className="font-semibold text-[var(--dv-text)]">{post.author}</span>}
            <span>{dateText(post.published_at, lang)}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {tr(`${readingMinutes(t.content)} phút đọc`)}
            </span>
          </p>
          {lang === 'en' && !t.isEnglish && (
            <p className="mt-5 rounded-[12px] bg-[#f5f5f7] px-4 py-3 text-[14px] text-[var(--dv-text-secondary)]">This article is currently available in Vietnamese only.</p>
          )}
        </article>
        {post.cover_url && (
          <div className="mx-auto mt-8 max-w-[1000px] px-4 md:px-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.cover_url} alt="" className="w-full rounded-[20px] bg-[#f5f5f7] object-cover" />
          </div>
        )}
        <div className="mx-auto mt-10 max-w-[720px] px-4 md:px-6">
          <AcademyMarkdown content={t.content} />
        </div>

        {related.length > 0 && (
          <section className="mx-auto mt-20 max-w-[1080px] border-t border-[#e0e0e5] px-4 pt-12 md:px-6">
            <h2 className="dv-display text-[26px] font-semibold">{tr('Bài viết khác')}</h2>
            <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
              {related.map(p => {
                const r = localizedPost(p, lang);
                return (
                  <Link key={p.id} href={`${base}/academy/${p.slug}`} className="group block">
                    <div className="aspect-[16/10] overflow-hidden rounded-[16px] bg-[#f5f5f7]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.cover_url && <img src={p.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    </div>
                    <p className="mt-3 text-[18px] font-semibold leading-[1.3] group-hover:underline">{r.title}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
