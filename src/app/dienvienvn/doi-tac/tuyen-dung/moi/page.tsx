import type { Metadata } from 'next';
import { PartnerCrewJobForm } from '@/components/dienvienvn/partner-portal';

export const metadata: Metadata = { title: 'Đăng tin tuyển ekip — Cổng đối tác DienVienVN', robots: { index: false, follow: false } };

export default function PartnerNewCrewJobPage() {
  return <PartnerCrewJobForm />;
}
