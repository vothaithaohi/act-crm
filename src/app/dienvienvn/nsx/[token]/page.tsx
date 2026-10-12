import type { Metadata } from 'next';
import { ProducerBoard } from '@/components/dienvienvn/producer-board';

// Link riêng gửi nhà sản xuất: không cho công cụ tìm kiếm lập chỉ mục.
export const metadata: Metadata = {
  title: 'Danh sách ứng viên — DienVienVN',
  robots: { index: false, follow: false, nocache: true }
};

export default async function ProducerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ProducerBoard token={token} />;
}
