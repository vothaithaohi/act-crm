import type { Metadata } from 'next';
import { WhyDienVienVN } from '@/components/dienvienvn/why-dienvienvn';
import { getHomeStats } from '@/lib/dienvienvn/home-stats';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

// Bản xem trước (chỉ dẫn tới từ menu trang chủ mới): chưa cho công cụ tìm kiếm lập chỉ mục.
const META: Metadata = {
  title: 'Tại sao chọn DienVienVN? — Dành cho đạo diễn & nhà sản xuất',
  description: 'Kho diễn viên đã được duyệt, hồ sơ đúng chuẩn casting, self-tape đi kèm. Quy trình làm việc và quyền lợi của đối tác DienVienVN.',
  robots: { index: false, follow: false }
};

export const revalidate = 300;

export default async function WhyPage() {
  const stats = await getHomeStats();
  return <WhyDienVienVN stats={stats} />;
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
