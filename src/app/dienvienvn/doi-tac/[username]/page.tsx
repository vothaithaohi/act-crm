import type { Metadata } from 'next';
import { PartnerTalentProfile } from '@/components/dienvienvn/partner-portal';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

const META: Metadata = {
  title: 'Hồ sơ diễn viên — Cổng đối tác DienVienVN',
  robots: { index: false, follow: false }
};

export default async function PartnerTalentPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <PartnerTalentProfile username={decodeURIComponent(username).toLowerCase()} />;
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
