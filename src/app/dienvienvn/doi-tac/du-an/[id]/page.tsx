import type { Metadata } from 'next';
import { PartnerProjectBoard } from '@/components/dienvienvn/partner-portal';

export const metadata: Metadata = {
  title: 'Dự án — Cổng đối tác DienVienVN',
  robots: { index: false, follow: false }
};

export default async function PartnerProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PartnerProjectBoard projectId={id} />;
}
