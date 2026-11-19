import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { unstable_cache } from 'next/cache';
import { AcademyList } from '@/components/dienvienvn/academy-pages';
import { listPublishedPosts } from '@/lib/dienvienvn/academy-server';
import { ACADEMY_CATEGORIES } from '@/lib/dienvienvn/academy';
import { SITE_URL } from '@/lib/dienvienvn/hosts';
import { getLang, localizeMetadata, serverTr } from '@/lib/dienvienvn/i18n/server';

export const dynamic = 'force-dynamic';

const META: Metadata = {
  title: 'Academy — DienVienVN',
  description: 'Kiến thức diễn xuất, casting và nghề diễn viên từ đội ngũ ACT Academy.',
  alternates: { canonical: `${SITE_URL}/academy` },
  openGraph: { title: 'Academy — DienVienVN', description: 'Kiến thức diễn xuất, casting và nghề diễn viên từ đội ngũ ACT Academy.', url: `${SITE_URL}/academy` }
};

// Lưu tạm 60 giây: bài mới đăng hiện sau tối đa 1 phút
const cachedPosts = unstable_cache(() => listPublishedPosts(), ['dvvn-academy-list'], { revalidate: 60 });

export default async function AcademyPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const c = (await searchParams).c || '';
  const category = ACADEMY_CATEGORIES.some(x => x.id === c) ? c : '';
  const base = (await headers()).get('x-dienvienvn-base') ?? '/dienvienvn';
  return <AcademyList posts={await cachedPosts()} category={category} ctx={{ base, lang: await getLang(), tr: await serverTr() }} />;
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
