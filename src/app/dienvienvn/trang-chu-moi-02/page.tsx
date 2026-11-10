import type { Metadata } from 'next';
import { DienVienVNLandingV2 } from '@/components/dienvienvn/landing-v2';
import { getHomeStats } from '@/lib/dienvienvn/home-stats';

// Bản xem trước "trang chủ mới 02" (gộp 00 + 01). Không thay trang chủ chính, /trang-chu-moi và /trang-chu-moi-01.
export const metadata: Metadata = {
  title: 'Xem trước trang chủ mới 02 — DienVienVN',
  robots: { index: false, follow: false }
};

export const revalidate = 300;

export default async function LandingPreviewV2Page() {
  const stats = await getHomeStats();
  return <DienVienVNLandingV2 stats={stats} />;
}
