import type { Metadata } from 'next';
import { PartnerTalentProfile } from '@/components/dienvienvn/partner-portal';

export const metadata: Metadata = {
  title: 'Hồ sơ diễn viên — Cổng đối tác DienVienVN',
  robots: { index: false, follow: false }
};

export default async function PartnerTalentPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <PartnerTalentProfile username={decodeURIComponent(username).toLowerCase()} />;
}
