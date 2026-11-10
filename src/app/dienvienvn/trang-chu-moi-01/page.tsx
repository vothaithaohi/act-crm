import type { Metadata } from 'next';
import { DienVienVNLandingV1 } from '@/components/dienvienvn/landing-v1';
import { getHomeStats } from '@/lib/dienvienvn/home-stats';

// Bản xem trước "trang chủ mới 01" để nhóm duyệt. Không thay trang chủ chính và trang /trang-chu-moi.
export const metadata: Metadata = {
  title: 'Xem trước trang chủ mới 01 — DienVienVN',
  robots: { index: false, follow: false }
};

export const revalidate = 300;

export default async function LandingPreviewV1Page() {
  const stats = await getHomeStats();
  return <DienVienVNLandingV1 stats={stats} />;
}
