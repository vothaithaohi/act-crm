'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, Plus, Trash2, Video } from 'lucide-react';
import { useCRM } from '@/lib/store/crm-context';
import { REVIEW_STATUS_DETAILS, getReviewStatus } from '@/lib/types/crm';
import { calculateAge, formatPhoneNumber } from '@/lib/utils';
import {
  APPLICATION_STATUS_DETAILS,
  ApplicationStatus,
  CastingProject,
  ProjectApplication
} from '@/lib/projects/types';
import { talentPath } from '@/lib/talent-path';

interface Props {
  project: CastingProject;
  applications: ProjectApplication[];
  onStatus: (id: string, status: ApplicationStatus) => void;
  onRemove: (id: string) => void;
  onAdd: (a: Pick<ProjectApplication, 'project_id' | 'role_id' | 'talent_id'>) => Promise<boolean>;
}

export function ProjectApplicants({ project, applications, onStatus, onRemove, onAdd }: Props) {
  const { talents, reviewTalent, refreshTalents, can } = useCRM();
  const canEdit = can('talents:write');
  const [roleFilter, setRoleFilter] = useState('all');
  const [addRole, setAddRole] = useState(project.roles[0]?.id || '');
  const [addQuery, setAddQuery] = useState('');
  const [addTalent, setAddTalent] = useState('');

  const talentById = useMemo(() => new Map(talents.map(t => [t.id, t])), [talents]);
  const rows = applications
    .filter(a => a.project_id === project.id && (roleFilter === 'all' || a.role_id === roleFilter))
    .map(a => ({ a, t: talentById.get(a.talent_id) }));

  // Hồ sơ vừa nộp/ứng tuyển sau khi mở CRM có thể chưa có trong danh sách đã tải → tải lại một lần
  const missingKey = rows.filter(r => !r.t).map(r => r.a.talent_id).sort().join(',');
  const triedKey = useRef('');
  const [reloading, setReloading] = useState(false);
  useEffect(() => {
    if (!missingKey || triedKey.current === missingKey) return;
    triedKey.current = missingKey;
    setReloading(true);
    refreshTalents().finally(() => setReloading(false));
  }, [missingKey, refreshTalents]);

  const visibleToProducer = applications.filter(a => {
    const t = talentById.get(a.talent_id);
    return a.project_id === project.id && a.status !== 'rejected' && t && getReviewStatus(t) === 'approved';
  }).length;
  const total = applications.filter(a => a.project_id === project.id).length;

  const roleName = (id: string) => project.roles.find(r => r.id === id)?.name || 'Vai đã xoá';

  const candidates = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return talents
      .filter(t => (t.full_name || '').toLowerCase().includes(q) || (t.phone || '').includes(q.replace(/\D/g, '') || '§'))
      .slice(0, 8);
  }, [addQuery, talents]);

  return (
    <section className="bg-card rounded-2xl border p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div>
          <h3 className="font-bold text-sm">Ứng viên ({total})</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Link NSX đang hiển thị <strong className="text-foreground">{visibleToProducer}</strong> người. Chỉ hồ sơ <strong>Đã duyệt</strong> và không bị
            &ldquo;Loại&rdquo; mới hiện trên link.
          </p>
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-3 py-2 rounded-lg border bg-background text-xs outline-none">
          <option value="all">Tất cả vai</option>
          {project.roles.map(r => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">Chưa có ứng viên nào.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ a, t }) => {
            const review = t ? getReviewStatus(t) : null;
            const age = t ? calculateAge(t.dob) : null;
            return (
              <div key={a.id} className="p-3 rounded-xl border flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-11 h-14 rounded-lg overflow-hidden bg-muted shrink-0 border">
                    {t?.headshot_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.headshot_url} alt="" className="w-full h-full object-cover object-top" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {t ? (
                        <Link href={talentPath(t)} className="font-bold text-sm hover:text-brand-600 truncate">
                          {t.full_name}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">{reloading ? 'Đang tải hồ sơ…' : 'Không tìm thấy hồ sơ — hãy tải lại trang'}</span>
                      )}
                      {review && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${REVIEW_STATUS_DETAILS[review].badgeClass}`}>
                          {REVIEW_STATUS_DETAILS[review].label}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {roleName(a.role_id)}
                      {t ? ` · ${t.gender === 'female' ? 'Nữ' : t.gender === 'male' ? 'Nam' : 'Khác'}` : ''}
                      {age !== null ? ` · ${age} tuổi` : ''}
                      {t?.height_cm ? ` · ${t.height_cm} cm` : ''}
                      {t?.phone ? ` · ${formatPhoneNumber(t.phone)}` : ''}
                    </p>
                    {a.note && <p className="text-[11px] italic text-muted-foreground truncate">&ldquo;{a.note}&rdquo;</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {a.selftape_url && (
                    <a href={a.selftape_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold hover:bg-muted">
                      <Video className="w-3.5 h-3.5 text-brand-600" /> Self-tape
                    </a>
                  )}
                  {canEdit && t && review !== 'approved' && (
                    <button
                      type="button"
                      onClick={() => reviewTalent(t.id, 'approved')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold"
                    >
                      <Check className="w-3.5 h-3.5" /> Duyệt hồ sơ
                    </button>
                  )}
                  <select
                    value={a.status}
                    disabled={!canEdit}
                    onChange={e => onStatus(a.id, e.target.value as ApplicationStatus)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold outline-none ${APPLICATION_STATUS_DETAILS[a.status].badgeClass}`}
                  >
                    {(Object.keys(APPLICATION_STATUS_DETAILS) as ApplicationStatus[]).map(s => (
                      <option key={s} value={s}>
                        {APPLICATION_STATUS_DETAILS[s].label}
                      </option>
                    ))}
                  </select>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => confirm('Gỡ ứng viên này khỏi dự án?') && onRemove(a.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                      title="Gỡ khỏi dự án"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canEdit && project.roles.length > 0 && (
        <div className="p-3.5 rounded-xl bg-muted/40 border space-y-2">
          <span className="text-xs font-semibold flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-brand-600" /> Thêm diễn viên từ kho vào dự án
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_200px_auto] gap-2">
            <div className="relative">
              <input
                value={addQuery}
                onChange={e => {
                  setAddQuery(e.target.value);
                  setAddTalent('');
                }}
                placeholder="Tìm theo tên hoặc SĐT (tối thiểu 2 ký tự)…"
                className="w-full px-3 py-2 rounded-lg border bg-background text-xs outline-none focus:border-brand-500"
              />
              {candidates.length > 0 && !addTalent && (
                <div className="absolute z-10 mt-1 w-full bg-card border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {candidates.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setAddTalent(t.id);
                        setAddQuery(t.full_name);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex justify-between gap-2"
                    >
                      <span className="font-semibold">{t.full_name}</span>
                      <span className="text-muted-foreground">{formatPhoneNumber(t.phone)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <select value={addRole} onChange={e => setAddRole(e.target.value)} className="px-3 py-2 rounded-lg border bg-background text-xs outline-none">
              {project.roles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!addTalent || !addRole}
              onClick={async () => {
                const ok = await onAdd({ project_id: project.id, role_id: addRole, talent_id: addTalent });
                if (ok) {
                  setAddTalent('');
                  setAddQuery('');
                }
              }}
              className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold disabled:opacity-50"
            >
              Thêm
            </button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <ExternalLink className="w-3 h-3" /> Đổi trạng thái &ldquo;Loại&rdquo; để ẩn ứng viên khỏi link NSX mà không cần xoá.
      </p>
    </section>
  );
}
