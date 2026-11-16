'use client';

import React from 'react';
import Link from 'next/link';
import { Clapperboard, Copy, EyeOff, Link2, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useCRM } from '@/lib/store/crm-context';
import { getReviewStatus } from '@/lib/types/crm';
import { CASTING_MODES, CastingMode, PROJECT_SOURCES, PROJECT_STATUS_DETAILS, ProjectSource, castingModeLabel, isDeadlinePassed, projectSource, projectTypeLabel, sourceLabel } from '@/lib/projects/types';
import { producerLink, publicProjectLink, useProjects } from '@/lib/projects/use-projects';
import { provinceLabel } from '@/lib/dienvienvn/provinces';
import { TEST_ROW, TestBadge, TestFilter, useTestMarks } from '@/components/admin/impersonation';

function vnDate(iso?: string | null) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function ProjectsList() {
  const { can, talents } = useCRM();
  const { projects, applications, loading } = useProjects();
  const testIds = useTestMarks('casting_projects');
  const [onlyTest, setOnlyTest] = React.useState(false);
  const [source, setSource] = React.useState<'all' | ProjectSource>('all');
  const [mode, setMode] = React.useState<'all' | 'none' | CastingMode>('all');
  const selectCls = 'h-8 px-3 rounded-full border bg-background text-xs font-semibold outline-none';
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

      <div className="flex flex-wrap items-center gap-2">
        <select className={selectCls} value={source} onChange={e => setSource(e.target.value as typeof source)} aria-label="Lọc theo nguồn dự án">
          <option value="all">Mọi nguồn</option>
          {PROJECT_SOURCES.map(o => (
            <option key={o.id} value={o.id}>
              {o.label} · {projects.filter(p => projectSource(p) === o.id).length}
            </option>
          ))}
        </select>
        <select className={selectCls} value={mode} onChange={e => setMode(e.target.value as typeof mode)} aria-label="Lọc theo hình thức casting">
          <option value="all">Mọi hình thức</option>
          {CASTING_MODES.map(o => (
            <option key={o.id} value={o.id}>
              {o.label} · {projects.filter(p => p.casting_mode === o.id).length}
            </option>
          ))}
          <option value="none">Chưa chọn hình thức</option>
        </select>
        <TestFilter count={projects.filter(p => testIds.has(p.id)).length} on={onlyTest} onChange={setOnlyTest} />
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
          {projects
            .filter(
              p =>
                (!onlyTest || testIds.has(p.id)) &&
                (source === 'all' || projectSource(p) === source) &&
                (mode === 'all' || (mode === 'none' ? !p.casting_mode : p.casting_mode === mode))
            )
            .map(p => {
            const apps = applications.filter(a => a.project_id === p.id);
            const visible = apps.filter(a => a.status !== 'rejected' && approved.has(a.talent_id)).length;
            const status = PROJECT_STATUS_DETAILS[p.status];
            const expired = p.status === 'open' && isDeadlinePassed(p.deadline);
            return (
              <div key={p.id} className={`bg-card rounded-2xl border p-5 space-y-3 hover:border-brand-500/40 transition-colors ${testIds.has(p.id) ? TEST_ROW : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  {testIds.has(p.id) && <TestBadge />}
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white">{p.code}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.badgeClass}`}>{status.label}</span>
                  {p.partner_id && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-[#c9a063]/10 text-[#8a6a35] border-[#c9a063]/40">
                      {p.status === 'draft' ? 'Đối tác đăng · chờ duyệt' : 'Đối tác đăng'}
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-muted text-foreground/80">{sourceLabel(projectSource(p))}</span>
                  {p.casting_mode && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-sky-50 text-sky-800 border-sky-200">{castingModeLabel(p.casting_mode)}</span>}
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
                  {/* Link công khai cho diễn viên (dự án nháp chưa hiện trên dienvienvn.com) */}
                  <button
                    type="button"
                    disabled={p.status === 'draft'}
                    title={p.status === 'draft' ? 'Dự án nháp chưa công khai' : 'Sao chép link dự án trên dienvienvn.com'}
                    onClick={async () => {
                      const url = publicProjectLink(p);
                      try {
                        await navigator.clipboard.writeText(url);
                        toast.success('Đã sao chép link công khai', { description: url });
                      } catch {
                        window.prompt('Sao chép link công khai:', url);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Link2 className="w-3.5 h-3.5" /> Link công khai{p.status === 'draft' ? ' · chưa công khai' : ''}
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
