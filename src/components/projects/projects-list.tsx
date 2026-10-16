'use client';

import React from 'react';
import Link from 'next/link';
import { Clapperboard, Copy, EyeOff, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useCRM } from '@/lib/store/crm-context';
import { getReviewStatus } from '@/lib/types/crm';
import { PROJECT_STATUS_DETAILS, isDeadlinePassed, projectTypeLabel } from '@/lib/projects/types';
import { producerLink, useProjects } from '@/lib/projects/use-projects';
import { provinceLabel } from '@/lib/dienvienvn/provinces';

function vnDate(iso?: string | null) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function ProjectsList() {
  const { can, talents } = useCRM();
  const { projects, applications, loading } = useProjects();
  const approved = new Set(talents.filter(t => getReviewStatus(t) === 'approved').map(t => t.id));

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <Clapperboard className="w-6 h-6 text-brand-600" />
            <span>Dự Án Casting</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Dự án &ldquo;Đang casting&rdquo; hiện trên dienvienvn.com để diễn viên ứng tuyển. Mỗi dự án có một link riêng gửi nhà sản xuất.
          </p>
        </div>
        {can('talents:write') && (
          <Link
            href="/projects/new"
            className="flex items-center gap-2 bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md w-fit"
          >
            <Plus className="w-4 h-4" /> Tạo dự án mới
          </Link>
        )}
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-muted-foreground">Đang tải dự án…</div>
      ) : projects.length === 0 ? (
        <div className="p-16 bg-card rounded-2xl border text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Clapperboard className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base">Chưa có dự án nào</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Tạo dự án, thêm các vai cần tuyển rồi chuyển trạng thái sang &ldquo;Đang casting&rdquo; để mở nhận hồ sơ trên dienvienvn.com.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projects.map(p => {
            const apps = applications.filter(a => a.project_id === p.id);
            const visible = apps.filter(a => a.status !== 'rejected' && approved.has(a.talent_id)).length;
            const status = PROJECT_STATUS_DETAILS[p.status];
            const expired = p.status === 'open' && isDeadlinePassed(p.deadline);
            return (
              <div key={p.id} className="bg-card rounded-2xl border p-5 space-y-3 hover:border-brand-500/40 transition-colors">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white">{p.code}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.badgeClass}`}>{status.label}</span>
                  {expired && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-300">Quá hạn nộp</span>}
                  {p.hide_title && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <EyeOff className="w-3 h-3" /> Ẩn tên
                    </span>
                  )}
                </div>
                <div>
                  <Link href={`/projects/${p.id}`} className="font-bold text-base hover:text-brand-600">
                    {p.title}
                  </Link>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {[projectTypeLabel(p.project_type), p.location ? provinceLabel(p.location) : null, p.deadline ? `Hạn ${vnDate(p.deadline)}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span>{p.roles.length} vai</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {apps.length} ứng tuyển · {visible} trên link NSX
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href={`/projects/${p.id}`} className="px-3 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold">
                    Quản lý & ứng viên
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(producerLink(p));
                        toast.success('Đã sao chép link NSX');
                      } catch {
                        toast.info(producerLink(p));
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold hover:bg-muted"
                  >
                    <Copy className="w-3.5 h-3.5" /> Link NSX
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
