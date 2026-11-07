import type { Metadata } from 'next';
import { PartnerCrewJobForm } from '@/components/dienvienvn/partner-portal';

export const metadata: Metadata = { title: 'Sửa tin tuyển ekip — Cổng đối tác DienVienVN', robots: { index: false, follow: false } };

export default async function PartnerEditCrewJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PartnerCrewJobForm jobId={id} />;
}
