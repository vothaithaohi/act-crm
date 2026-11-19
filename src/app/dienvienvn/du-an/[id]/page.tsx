import type { Metadata } from 'next';
import { ProjectDetail } from '@/components/dienvienvn/project-detail';
import { projectMetadata } from '@/lib/projects/project-meta';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

async function baseMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return projectMetadata((await params).id);
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetail projectId={id} />;
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = async (...a: Parameters<typeof baseMetadata>) => localizeMetadata(await baseMetadata(...a));
