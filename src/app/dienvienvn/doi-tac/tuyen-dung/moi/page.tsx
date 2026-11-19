import type { Metadata } from 'next';
import { PartnerCrewJobForm } from '@/components/dienvienvn/partner-portal';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

const META: Metadata = { title: 'Đăng tin tuyển ekip — Cổng đối tác DienVienVN', robots: { index: false, follow: false } };

export default function PartnerNewCrewJobPage() {
  return <PartnerCrewJobForm />;
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
