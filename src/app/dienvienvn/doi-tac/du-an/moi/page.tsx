import type { Metadata } from 'next';
import { PartnerProjectForm } from '@/components/dienvienvn/partner-portal';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

const META: Metadata = {
  title: 'Đăng casting mới — Cổng đối tác DienVienVN',
  robots: { index: false, follow: false }
};

export default function PartnerNewProjectPage() {
  return <PartnerProjectForm />;
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
