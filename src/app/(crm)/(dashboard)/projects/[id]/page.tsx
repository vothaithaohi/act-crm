'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { ProjectEditor } from '@/components/projects/project-editor';
import { ProjectApplicants } from '@/components/projects/project-applicants';
import { useProjects } from '@/lib/projects/use-projects';
import { PROJECT_STATUS_DETAILS } from '@/lib/projects/types';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { projects, applications, loading, refresh, updateApplicationStatus, removeApplication, addApplication } = useProjects();
  const project = projects.find(p => p.id === id);

  return (
    <PermissionGuard permission="talents:read" customTitle="Dự Án Casting" customMessage="Bạn không có quyền xem dự án casting.">
      <div className="max-w-4xl mx-auto space-y-5 pb-16">
        <Link href="/projects" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-fit">
          <ArrowLeft className="w-4 h-4" /> Dự án casting
        </Link>
        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground">Đang tải dự án…</div>
        ) : !project ? (
          <div className="p-16 bg-card rounded-2xl border text-center text-sm">Không tìm thấy dự án.</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white">{project.code}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PROJECT_STATUS_DETAILS[project.status].badgeClass}`}>
                {PROJECT_STATUS_DETAILS[project.status].label}
              </span>
              <h1 className="w-full text-2xl font-bold tracking-tight">{project.title}</h1>
            </div>
            <ProjectApplicants
              project={project}
              applications={applications}
              onStatus={updateApplicationStatus}
              onRemove={removeApplication}
              onAdd={addApplication}
            />
            <ProjectEditor key={project.updated_at || project.id} initial={project} onSaved={refresh} />
          </>
        )}
      </div>
    </PermissionGuard>
  );
}
