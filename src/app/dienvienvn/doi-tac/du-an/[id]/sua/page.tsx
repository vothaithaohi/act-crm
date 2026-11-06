import type { Metadata } from 'next';
import { PartnerProjectForm } from '@/components/dienvienvn/partner-portal';

export const metadata: Metadata = {
  title: 'Sửa casting — Cổng đối tác DienVienVN',
  robots: { index: false, follow: false }
};

export default async function PartnerEditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PartnerProjectForm projectId={id} />;
}
