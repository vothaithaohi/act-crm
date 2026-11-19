import type { Metadata } from 'next';
import { ProjectDetail } from '@/components/dienvienvn/project-detail';
import { projectMetadata } from '@/lib/projects/project-meta';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

// Link riêng của từng vai: /du-an/ten-du-an/ten-vai → trang dự án, cuộn tới và làm nổi vai đó.
async function baseMetadata({ params }: { params: Promise<{ id: string; role: string }> }): Promise<Metadata> {
  const { id, role } = await params;
  return projectMetadata(id, role);
}

export default async function ProjectRolePage({ params }: { params: Promise<{ id: string; role: string }> }) {
  const { id, role } = await params;
  return <ProjectDetail projectId={id} roleParam={role} />;
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = async (...a: Parameters<typeof baseMetadata>) => localizeMetadata(await baseMetadata(...a));
