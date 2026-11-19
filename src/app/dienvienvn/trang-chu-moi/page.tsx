import type { Metadata } from 'next';
import { DienVienVNLanding } from '@/components/dienvienvn/landing-page';
import { getHomeStats } from '@/lib/dienvienvn/home-stats';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

// Bản xem trước trang chủ mới để nhóm duyệt. Duyệt xong: đổi trang chủ (page.tsx) sang DienVienVNLanding.
const META: Metadata = {
  title: 'Xem trước trang chủ mới — DienVienVN',
  robots: { index: false, follow: false }
};

export const revalidate = 300;

export default async function LandingPreviewPage() {
  const stats = await getHomeStats();
  return <DienVienVNLanding stats={stats} />;
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
