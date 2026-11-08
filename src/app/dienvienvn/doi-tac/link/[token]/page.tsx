import type { Metadata } from 'next';
import { PartnerLinkBoard } from '@/components/dienvienvn/partner-link-board';

// Link riêng gửi NSX: không cho công cụ tìm kiếm lập chỉ mục.
export const metadata: Metadata = {
  title: 'Dự án và diễn viên ứng tuyển — DienVienVN',
  robots: { index: false, follow: false, nocache: true }
};

export default async function PartnerLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PartnerLinkBoard token={token} />;
}
