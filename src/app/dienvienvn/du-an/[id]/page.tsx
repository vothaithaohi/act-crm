import type { Metadata } from 'next';
import { ProjectDetail } from '@/components/dienvienvn/project-detail';
import { projectMetadata } from '@/lib/projects/project-meta';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return projectMetadata((await params).id);
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetail projectId={id} />;
}
