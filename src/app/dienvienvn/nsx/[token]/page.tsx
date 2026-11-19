import type { Metadata } from 'next';
import { ProducerBoard } from '@/components/dienvienvn/producer-board';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

// Link riêng gửi nhà sản xuất: không cho công cụ tìm kiếm lập chỉ mục.
const META: Metadata = {
  title: 'Danh sách ứng viên — DienVienVN',
  robots: { index: false, follow: false, nocache: true }
};

export default async function ProducerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ProducerBoard token={token} />;
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
