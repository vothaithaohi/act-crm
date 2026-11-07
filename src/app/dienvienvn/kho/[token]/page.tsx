import type { Metadata } from 'next';
import { TalentCatalog } from '@/components/dienvienvn/talent-catalog';

// Link riêng gửi đạo diễn / nhà sản xuất: không cho công cụ tìm kiếm lập chỉ mục.
export const metadata: Metadata = {
  title: 'Kho diễn viên — DienVienVN',
  robots: { index: false, follow: false, nocache: true }
};

export default async function TalentCatalogPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <TalentCatalog token={token} />;
}
