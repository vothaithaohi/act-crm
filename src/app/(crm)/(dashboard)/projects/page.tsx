'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { ProjectsList } from '@/components/projects/projects-list';

export default function ProjectsPage() {
  return (
    <PermissionGuard permission="talents:read" customTitle="Dự Án Casting" customMessage="Bạn không có quyền xem dự án casting.">
      <ProjectsList />
    </PermissionGuard>
  );
}
