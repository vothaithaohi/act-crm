import type { Metadata } from 'next';
import { PartnerCrewJobForm } from '@/components/dienvienvn/partner-portal';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

const META: Metadata = { title: 'Sửa tin tuyển ekip — Cổng đối tác DienVienVN', robots: { index: false, follow: false } };

export default async function PartnerEditCrewJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PartnerCrewJobForm jobId={id} />;
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
