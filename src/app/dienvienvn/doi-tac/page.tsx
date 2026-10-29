import type { Metadata } from 'next';
import { PartnerDirectory } from '@/components/dienvienvn/partner-portal';

export const metadata: Metadata = {
  title: 'Cổng đối tác — DienVienVN',
  description: 'Dành cho đạo diễn, nhà sản xuất và đối tác casting: xem đầy đủ hồ sơ diễn viên đã duyệt.',
  robots: { index: false, follow: false }
};

export default function PartnerPortalPage() {
  return <PartnerDirectory />;
}
