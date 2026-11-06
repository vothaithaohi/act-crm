import type { Metadata } from 'next';
import { PartnerProjectForm } from '@/components/dienvienvn/partner-portal';

export const metadata: Metadata = {
  title: 'Đăng casting mới — Cổng đối tác DienVienVN',
  robots: { index: false, follow: false }
};

export default function PartnerNewProjectPage() {
  return <PartnerProjectForm />;
}
