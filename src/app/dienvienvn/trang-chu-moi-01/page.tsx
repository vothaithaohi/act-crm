import type { Metadata } from 'next';
import { DienVienVNLandingV1 } from '@/components/dienvienvn/landing-v1';
import { getHomeStats } from '@/lib/dienvienvn/home-stats';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

// Bản xem trước "trang chủ mới 01" để nhóm duyệt. Không thay trang chủ chính và trang /trang-chu-moi.
const META: Metadata = {
  title: 'Xem trước trang chủ mới 01 — DienVienVN',
  robots: { index: false, follow: false }
};

export const revalidate = 300;

export default async function LandingPreviewV1Page() {
  const stats = await getHomeStats();
  return <DienVienVNLandingV1 stats={stats} />;
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
