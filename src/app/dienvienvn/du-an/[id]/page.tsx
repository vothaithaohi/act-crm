import type { Metadata } from 'next';
import { ProjectDetail } from '@/components/dienvienvn/project-detail';

export const metadata: Metadata = {
  title: 'Dự án đang casting — DienVienVN',
  description: 'Xem các vai đang tuyển và ứng tuyển trực tiếp trên DienVienVN.',
  robots: { index: false, follow: false }
};

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetail projectId={id} />;
}
