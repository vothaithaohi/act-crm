'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { ProjectEditor } from '@/components/projects/project-editor';

export default function NewProjectPage() {
  return (
    <PermissionGuard permission="talents:write" customTitle="Tạo Dự Án Casting" customMessage="Chỉ Casting Director và Ban Giám Đốc được tạo dự án.">
      <div className="max-w-4xl mx-auto space-y-5 pb-16">
        <Link href="/projects" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-fit">
          <ArrowLeft className="w-4 h-4" /> Dự án casting
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Tạo dự án casting mới</h1>
        <ProjectEditor />
      </div>
    </PermissionGuard>
  );
}
