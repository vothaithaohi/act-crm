'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BriefcaseBusiness, Check, ExternalLink, Link2, Loader2, Pencil, Plus, Trash2, UsersRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { createClient } from '@/lib/supabase/client';
import { useCRM } from '@/lib/store/crm-context';
import { CREW_JOB_STATUS, CrewJob, CrewJobStatus, crewJobPath, parseCrewJobBatch, toCrewJobColumns } from '@/lib/dienvienvn/crew-jobs';
import { CrewFormA, CrewJobFields, crewFormFrom, crewFormPayload } from '@/components/dienvienvn/crew-job-fields';
import { CrewAttachmentsBlock, CrewProfileDetails } from '@/components/dienvienvn/crew-profile-view';
import { authedFetch } from '@/lib/supabase/authed-fetch';
import { CREW_REVIEW_STATUS, CrewAttachments, CrewProfile } from '@/lib/dienvienvn/crew-profiles';

const PUBLIC_URL = 'https://www.dienvienvn.com/tuyen-dung';
const MIGRATION_HINT = 'Hãy chạy migration 20261109_crew_jobs.sql, 20261113_crew_jobs_form_a.sql và 20261114_crew_jobs_multi_role.sql trong Supabase.';

type Draft = { id?: string; status: CrewJobStatus; form: CrewFormA };
const emptyDraft = (): Draft => ({ status: 'open', form: crewFormFrom(null, 'ACT Academy') });

/** Tin tuyển ekip: duyệt tin đối tác đăng, ACT tự đăng / sửa / đóng tin. Hiện công khai tại dienvienvn.com/tuyen-dung. */
export default function CrewJobsPage() {
  const { currentUser, can } = useCRM();
  // Vai trò Chỉ xem: xem tin + ứng viên, không đăng / duyệt / sửa / xoá
  const canEdit = can('talents:write');
  const [jobs, setJobs] = useState<CrewJob[] | null>(null);
  const [problem, setProblem] = useState('');
  const [filter, setFilter] = useState<'all' | CrewJobStatus>('all');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Ứng viên ekip theo tin (bảng crew_applications có sau migration 20261115_crew_profiles.sql)
  const [applicants, setApplicants] = useState<Map<string, { id: string; profile: CrewProfile; applied_at: string }[]>>(new Map());
  const [viewing, setViewing] = useState<CrewJob | null>(null);

  const load = useCallback(async () => {
    const db = createClient();
    if (!db) return setProblem('Tính năng cần kết nối Supabase (chế độ demo chưa hỗ trợ).');
    const { data, error } = await db.from('crew_jobs').select('*').order('created_at', { ascending: false });
    if (error) return setProblem(`Không tải được tin tuyển dụng: ${error.message}. ${MIGRATION_HINT}`);
    setProblem('');
    const list = (data || []) as CrewJob[];
    // Tin chờ duyệt lên đầu
    setJobs([...list.filter(j => j.status === 'draft'), ...list.filter(j => j.status !== 'draft')]);
    const [{ data: apps }, { data: profiles }] = await Promise.all([
      db.from('crew_applications').select('*').order('created_at', { ascending: false }),
      db.from('crew_profiles').select('*')
    ]);
    const byId = new Map(((profiles || []) as CrewProfile[]).map(p => [p.id, p]));
    const grouped = new Map<string, { id: string; profile: CrewProfile; applied_at: string }[]>();
    for (const a of (apps || []) as { id: string; job_id: string; crew_profile_id: string; created_at: string }[]) {
      const profile = byId.get(a.crew_profile_id);
      if (!profile) continue;
      grouped.set(a.job_id, [...(grouped.get(a.job_id) || []), { id: a.id, profile, applied_at: a.created_at }]);
    }
    setApplicants(grouped);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (j: CrewJob, status: CrewJobStatus, msg: string) => {
    const db = createClient();
    if (!db) return;
    setBusyId(j.id);
    const { error } = await db.from('crew_jobs').update({ status, updated_at: new Date().toISOString() }).eq('id', j.id);
    setBusyId(null);
    if (error) return toast.error('Không lưu được', { description: error.message });
    setJobs(list => (list || []).map(x => (x.id === j.id ? { ...x, status } : x)));
    toast.success(msg);
  };

  const remove = async (j: CrewJob) => {
    if (!window.confirm(`Xoá tin "${j.title}"?`)) return;
    const db = createClient();
    if (!db) return;
    setBusyId(j.id);
    const { error } = await db.from('crew_jobs').delete().eq('id', j.id);
    setBusyId(null);
    if (error) return toast.error('Không xoá được', { description: error.message });
    setJobs(list => (list || []).filter(x => x.id !== j.id));
    toast.success('Đã xoá tin.');
  };

  const save = async (d: Draft) => {
    const db = createClient();
    if (!db) return false;
    // Đăng mới: mỗi vị trí là một tin (chung group_id); sửa: đúng một tin
    const parsed = parseCrewJobBatch(crewFormPayload(d.form, !!d.id));
    if (!parsed.ok) {
      toast.error(parsed.error);
      return false;
    }
    const now = new Date().toISOString();
    const group_id = crypto.randomUUID();
    const { error } = d.id
      ? await db.from('crew_jobs').update({ ...toCrewJobColumns(parsed.inputs[0]), status: d.status, updated_at: now }).eq('id', d.id)
      : await db
          .from('crew_jobs')
          .insert(parsed.inputs.map(input => ({ ...toCrewJobColumns(input), group_id, status: d.status, updated_at: now, created_by: currentUser?.email || 'ACT' })));
    if (error) {
      toast.error('Không lưu được tin', { description: `${error.message}. ${MIGRATION_HINT}` });
      return false;
    }
    toast.success(d.id ? 'Đã lưu tin.' : parsed.inputs.length > 1 ? `Đã đăng ${parsed.inputs.length} tin (${parsed.inputs.length} vị trí).` : 'Đã đăng tin.');
    await load();
    return true;
  };

  const shown = (jobs || []).filter(j => filter === 'all' || j.status === filter);
  const pending = (jobs || []).filter(j => j.status === 'draft').length;

  return (
    <PermissionGuard permissions={['talents:write', 'crew:read']} customTitle="Tuyển dụng ekip" customMessage="Chỉ Ban Giám Đốc và bộ phận Casting quản lý tin tuyển dụng.">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
              <BriefcaseBusiness className="w-6 h-6" /> Tuyển dụng ekip
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Tin tuyển ekip (audition, trường quay, hậu kỳ) hiện tại{' '}
              <a href={PUBLIC_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline underline-offset-2">
                dienvienvn.com/tuyen-dung
              </a>
              . Đối tác tự đăng sẽ ở trạng thái &ldquo;Chờ duyệt&rdquo;; bấm Duyệt để hiện công khai.
            </p>
            {pending > 0 && (
              <p className="mt-3 inline-flex rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">{pending} tin đang chờ duyệt</p>
            )}
          </div>
          {canEdit && <button onClick={() => setEditing(emptyDraft())} className="h-10 inline-flex items-center gap-2 px-4 rounded-xl bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold shrink-0">
            <Plus className="w-4 h-4" /> Đăng tin
          </button>}
        </div>

        {problem ? (
          <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">{problem}</div>
        ) : !jobs ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {(['all', 'draft', 'open', 'closed'] as const).map(k => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`h-8 px-3 rounded-full border text-xs font-semibold ${filter === k ? 'bg-[#1d1d1f] text-white border-[#1d1d1f]' : 'hover:bg-muted'}`}
                >
                  {k === 'all' ? `Tất cả · ${jobs.length}` : `${CREW_JOB_STATUS[k].label} · ${jobs.filter(j => j.status === k).length}`}
                </button>
              ))}
            </div>
            {shown.length === 0 ? (
              <div className="p-12 rounded-2xl border bg-card text-center text-sm text-muted-foreground">Chưa có tin tuyển dụng nào.</div>
            ) : (
              <div className="rounded-2xl border bg-card divide-y">
                {shown.map(j => (
                  <div key={j.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${CREW_JOB_STATUS[j.status].badge}`}>{CREW_JOB_STATUS[j.status].label}</span>
                        {j.partner_id && <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8c5f2a]">Đối tác đăng</span>}
                      </div>
                      <p className="mt-1 font-semibold">{j.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {[j.company, j.positions.join(', '), j.location, j.deadline ? `Hạn ${new Date(j.deadline).toLocaleDateString('vi-VN')}` : null].filter(Boolean).join(' · ')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Liên hệ: {j.contact}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {busyId === j.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      {j.status === 'open' && (
                        <button
                          title="Sao chép link tin"
                          onClick={async () => {
                            const url = `https://www.dienvienvn.com${crewJobPath(j)}`;
                            try {
                              await navigator.clipboard.writeText(url);
                              toast.success('Đã sao chép link', { description: url });
                            } catch {
                              window.prompt('Sao chép link tin:', url);
                            }
                          }}
                          className="h-8 inline-flex items-center gap-1 px-2.5 rounded-lg border text-xs font-semibold hover:bg-muted"
                        >
                          <Link2 className="w-3.5 h-3.5" /> Link
                        </button>
                      )}
                      <button onClick={() => setViewing(j)} className="h-8 inline-flex items-center gap-1 px-2.5 rounded-lg border text-xs font-semibold hover:bg-muted">
                        <UsersRound className="w-3.5 h-3.5" /> Ứng viên · {(applicants.get(j.id) || []).length}
                      </button>
                      {canEdit && j.status === 'draft' && (
                        <button onClick={() => setStatus(j, 'open', 'Đã duyệt — tin hiện công khai.')} className="h-8 inline-flex items-center gap-1 px-2.5 rounded-lg bg-[#1d1d1f] text-white text-xs font-semibold">
                          <Check className="w-3.5 h-3.5" /> Duyệt
                        </button>
                      )}
                      {canEdit && j.status === 'open' && (
                        <button onClick={() => setStatus(j, 'closed', 'Đã đóng tin.')} className="h-8 px-2.5 rounded-lg border text-xs font-semibold hover:bg-muted">
                          Đóng tin
                        </button>
                      )}
                      {canEdit && j.status === 'closed' && (
                        <button onClick={() => setStatus(j, 'open', 'Đã mở lại tin.')} className="h-8 px-2.5 rounded-lg border text-xs font-semibold hover:bg-muted">
                          Mở lại
                        </button>
                      )}
                      {canEdit && (
                      <>
                      <button title="Sửa" onClick={() => setEditing({ id: j.id, status: j.status, form: crewFormFrom(j) })} className="h-8 w-8 inline-flex items-center justify-center rounded-lg border hover:bg-muted">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button title="Xoá" onClick={() => remove(j)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg border hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <a href={PUBLIC_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline">
              Xem trang tuyển dụng công khai <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </>
        )}
      </div>

      {viewing && <ApplicantsModal job={viewing} list={applicants.get(viewing.id) || []} onClose={() => setViewing(null)} />}
      {editing && <CrewJobModal draft={editing} onClose={() => setEditing(null)} onSave={async d => (await save(d)) && setEditing(null)} />}
    </PermissionGuard>
  );
}

function ApplicantsModal({ job, list, onClose }: { job: CrewJob; list: { id: string; profile: CrewProfile; applied_at: string }[]; onClose: () => void }) {
  // CV / cover letter đã nộp (link xem tạm do máy chủ tạo)
  const [files, setFiles] = useState<Record<string, CrewAttachments> | null>(null);
  useEffect(() => {
    authedFetch(`/api/admin/crew-applications?job_id=${encodeURIComponent(job.id)}`)
      .then(r => r.json())
      .then(b => setFiles(b.attachments || {}))
      .catch(() => setFiles({}));
  }, [job.id]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto bg-card rounded-2xl border shadow-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Ứng viên</h2>
            <p className="text-xs text-muted-foreground">{job.title}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-muted" aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Nhà tuyển dụng thấy ứng viên có tài khoản đang hoạt động. Khoá / mở khoá tại mục &ldquo;Ứng viên ekip&rdquo;.</p>
        {list.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Chưa có ứng viên.</p>
        ) : (
          <div className="space-y-3">
            {list.map(({ id, profile, applied_at }) => (
              <div key={id} className="rounded-xl border p-4 space-y-2">
                <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${CREW_REVIEW_STATUS[profile.review_status].badge}`}>
                  Tài khoản: {CREW_REVIEW_STATUS[profile.review_status].label}
                </span>
                <CrewProfileDetails p={{ ...profile, applied_at }} compact />
                <div className="border-t pt-2">
                  {files ? <CrewAttachmentsBlock a={files[id]} /> : <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CrewJobModal({ draft, onClose, onSave }: { draft: Draft; onClose: () => void; onSave: (d: Draft) => Promise<unknown> }) {
  const [d, setD] = useState<Draft>(draft);
  const [busy, setBusy] = useState(false);
  const cls = 'w-full h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:border-foreground';
  const label = 'block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto bg-card rounded-2xl border shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{d.id ? 'Sửa tin tuyển dụng' : 'Đăng tin tuyển dụng'}</h2>
          <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-muted" aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div>
          <label className={label}>Trạng thái</label>
          <select className={cls} value={d.status} onChange={e => setD(x => ({ ...x, status: e.target.value as CrewJobStatus }))}>
            {(Object.keys(CREW_JOB_STATUS) as CrewJobStatus[]).map(k => (
              <option key={k} value={k}>
                {CREW_JOB_STATUS[k].label}
              </option>
            ))}
          </select>
        </div>
        <CrewJobFields variant="crm" multi={!d.id} value={d.form} onChange={form => setD(x => ({ ...x, form }))} />
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border text-xs font-semibold hover:bg-muted">
            Huỷ
          </button>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onSave(d);
              setBusy(false);
            }}
            className="h-10 inline-flex items-center gap-2 px-4 rounded-lg bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold disabled:opacity-50"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
