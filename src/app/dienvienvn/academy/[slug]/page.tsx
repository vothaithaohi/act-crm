import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { AcademyArticle } from '@/components/dienvienvn/academy-pages';
import { getPublishedPost, listPublishedPosts, localizedPost } from '@/lib/dienvienvn/academy-server';
import { SITE_URL } from '@/lib/dienvienvn/hosts';
import { getLang } from '@/lib/dienvienvn/i18n/server';
import { serverTr } from '@/lib/dienvienvn/i18n/server';

export const dynamic = 'force-dynamic';

const cachedPost = unstable_cache((slug: string) => getPublishedPost(slug), ['dvvn-academy-post'], { revalidate: 60 });
const cachedList = unstable_cache(() => listPublishedPosts(), ['dvvn-academy-list'], { revalidate: 60 });

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await cachedPost((await params).slug);
  if (!post) return { title: 'Academy — DienVienVN', robots: { index: false } };
  const lang = await getLang();
  const t = localizedPost(post, lang);
  const vi = `${SITE_URL}/academy/${post.slug}`;
  const en = `${SITE_URL}/en/academy/${post.slug}`;
  const url = lang === 'en' ? en : vi;
  const description = (t.excerpt || t.content.replace(/[#>*_`[\]()!-]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 200);
  return {
    title: `${t.title} — DienVienVN Academy`,
    description,
    alternates: { canonical: url, languages: { vi, en } },
    openGraph: {
      title: t.title,
      description,
      url,
      type: 'article',
      locale: lang === 'en' ? 'en_US' : 'vi_VN',
      publishedTime: post.published_at || undefined,
      ...(post.cover_url ? { images: [{ url: post.cover_url }] } : {})
    },
    twitter: { card: 'summary_large_image', title: t.title, description, ...(post.cover_url ? { images: [post.cover_url] } : {}) }
  };
}

export default async function AcademyArticlePage({ params }: Props) {
  const post = await cachedPost((await params).slug);
  if (!post) notFound();
  const all = await cachedList();
  // Bài khác: ưu tiên cùng chuyên mục
  const others = all.filter(p => p.id !== post.id);
  const related = [...others.filter(p => p.category === post.category), ...others.filter(p => p.category !== post.category)].slice(0, 3);
  const base = (await headers()).get('x-dienvienvn-base') ?? '/dienvienvn';
  return <AcademyArticle post={post} related={related} ctx={{ base, lang: await getLang(), tr: await serverTr() }} />;
}
