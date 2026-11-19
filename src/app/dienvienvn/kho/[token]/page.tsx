import type { Metadata } from 'next';
import { TalentCatalog } from '@/components/dienvienvn/talent-catalog';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

// Link riêng gửi đạo diễn / nhà sản xuất: không cho công cụ tìm kiếm lập chỉ mục.
const META: Metadata = {
  title: 'Kho diễn viên — DienVienVN',
  robots: { index: false, follow: false, nocache: true }
};

export default async function TalentCatalogPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <TalentCatalog token={token} />;
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
