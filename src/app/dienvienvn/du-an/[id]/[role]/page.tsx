import type { Metadata } from 'next';
import { ProjectDetail } from '@/components/dienvienvn/project-detail';
import { projectMetadata } from '@/lib/projects/project-meta';

// Link riêng của từng vai: /du-an/ten-du-an/ten-vai → trang dự án, cuộn tới và làm nổi vai đó.
export async function generateMetadata({ params }: { params: Promise<{ id: string; role: string }> }): Promise<Metadata> {
  const { id, role } = await params;
  return projectMetadata(id, role);
}

export default async function ProjectRolePage({ params }: { params: Promise<{ id: string; role: string }> }) {
  const { id, role } = await params;
  return <ProjectDetail projectId={id} roleParam={role} />;
}
