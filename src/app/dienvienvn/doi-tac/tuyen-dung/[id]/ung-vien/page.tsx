import type { Metadata } from 'next';
import { PartnerCrewApplicants } from '@/components/dienvienvn/partner-portal';

export const metadata: Metadata = { title: 'Ứng viên tin tuyển ekip — Cổng đối tác DienVienVN', robots: { index: false, follow: false } };

export default async function PartnerCrewApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PartnerCrewApplicants jobId={id} />;
}
