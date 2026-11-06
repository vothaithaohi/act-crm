import type { Metadata } from 'next';
import { DienVienVNLanding } from '@/components/dienvienvn/landing-page';
import { getHomeStats } from '@/lib/dienvienvn/home-stats';

// Bản xem trước trang chủ mới để nhóm duyệt. Duyệt xong: đổi trang chủ (page.tsx) sang DienVienVNLanding.
export const metadata: Metadata = {
  title: 'Xem trước trang chủ mới — DienVienVN',
  robots: { index: false, follow: false }
};

export const revalidate = 300;

export default async function LandingPreviewPage() {
  const stats = await getHomeStats();
  return <DienVienVNLanding stats={stats} />;
}
