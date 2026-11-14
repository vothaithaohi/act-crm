'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ExternalLink, FileText, Link2, Loader2, Lock, LockOpen, Trash2, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { createClient } from '@/lib/supabase/client';
import { authedFetch } from '@/lib/supabase/authed-fetch';
import { useCRM } from '@/lib/store/crm-context';
import { CREW_REVIEW_STATUS, CrewAttachments, CrewProfile, CrewReviewStatus, crewPrimaryRoleText } from '@/lib/dienvienvn/crew-profiles';
import { CrewAttachmentsBlock, CrewProfileDetails } from '@/components/dienvienvn/crew-profile-view';
import { ImpersonateButton, TEST_ROW, TestBadge, useTestMarks } from '@/components/admin/impersonation';

const MIGRATION_HINT = 'Hãy chạy migration 20261115_crew_profiles.sql trong Supabase.';

/** Ứng viên ekip: tài khoản tự đăng ký trên dienvienvn.com/ekip, hoạt động ngay; ACT khoá / mở khoá, xem kho CV và các lượt ứng tuyển. */
export default function CrewProfilesPage() {
  const { can } = useCRM();
  // Vai trò Chỉ xem: xem hồ sơ, CV, cover letter; không khoá / mở khoá / xoá
  const canEdit = can('talents:write');
  const canDelete = can('talents:delete');
  const [list, setList] = useState<(CrewProfile & { app_count: number })[] | null>(null);
  const [problem, setProblem] = useState('');
  const [filter, setFilter] = useState<'all' | CrewReviewStatus>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const testIds = useTestMarks('crew_profiles');

  const load = useCallback(async () => {
    const db = createClient();
    if (!db) return setProblem('Tính năng cần kết nối Supabase (chế độ demo chưa hỗ trợ).');
    const [{ data, error }, { data: apps }] = await Promise.all([
      db.from('crew_profiles').select('*').order('created_at', { ascending: false }),
      db.from('crew_applications').select('crew_profile_id')
    ]);
    if (error) return setProblem(`Không tải được hồ sơ ekip: ${error.message}. ${MIGRATION_HINT}`);
    const counts = new Map<string, number>();
    for (const a of (apps || []) as { crew_profile_id: string }[]) counts.set(a.crew_profile_id, (counts.get(a.crew_profile_id) || 0) + 1);
    setProblem('');
    setList(((data || []) as CrewProfile[]).map(p => ({ ...p, app_count: counts.get(p.id) || 0 })));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (p: CrewProfile, review_status: CrewReviewStatus) => {
    setBusyId(p.id);
    try {
      const res = await authedFetch(`/api/admin/crew-profiles/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_status })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(body.error || 'Không lưu được');
      setList(l => (l || []).map(x => (x.id === p.id ? { ...x, review_status } : x)));
      toast.success(
        review_status === 'approved'
          ? body.notified
            ? `Đã mở khoá — đã gửi email báo ${body.notified} nhà tuyển dụng.`
            : 'Đã mở khoá tài khoản.'
          : 'Đã khoá tài khoản.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (p: CrewProfile) => {
    if (!window.confirm(`Xoá hẳn ứng viên ekip ${p.full_name} (${p.public_email})? Hồ sơ, các lượt ứng tuyển, CV / cover letter và tài khoản đăng nhập của email này sẽ bị xoá. Không hoàn tác được.`)) return;
    setBusyId(p.id);
    try {
      const res = await authedFetch(`/api/admin/crew-profiles/${p.id}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(body.error || 'Không xoá được');
      setList(l => (l || []).filter(x => x.id !== p.id));
      toast.success('Đã xoá ứng viên ekip.');
    } finally {
      setBusyId(null);
    }
  };

  const needle = q.trim().toLowerCase();
  const shown = (list || []).filter(
    p =>
      (filter === 'all' || p.review_status === filter) &&
      (!needle || [p.full_name, p.display_name, p.public_email, p.public_phone].some(v => (v || '').toLowerCase().includes(needle)))
  );
  // "Chờ duyệt" chỉ còn ở hồ sơ tạo trước khi bỏ bước duyệt
  const tabs = (['all', 'approved', 'rejected', 'pending'] as const).filter(k => k !== 'pending' || (list || []).some(p => p.review_status === 'pending'));

  return (
    <PermissionGuard permissions={['talents:write', 'crew:read']} customTitle="Ứng viên ekip" customMessage="Chỉ Ban Giám Đốc và bộ phận Casting quản lý ứng viên ekip.">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <UsersRound className="w-6 h-6" /> Ứng viên ekip
          </h1>
        </div>

        {problem ? (
          <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">{problem}</div>
        ) : !list ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Tìm tên, email, SĐT…"
                className="h-8 w-56 px-3 rounded-full border bg-background text-xs outline-none focus:border-foreground"
              />
              {tabs.map(k => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`h-8 px-3 rounded-full border text-xs font-semibold ${filter === k ? 'bg-[#1d1d1f] text-white border-[#1d1d1f]' : 'hover:bg-muted'}`}
                >
                  {k === 'all' ? `Tất cả · ${list.length}` : `${CREW_REVIEW_STATUS[k].label} · ${list.filter(p => p.review_status === k).length}`}
                </button>
              ))}
            </div>
            {shown.length === 0 ? (
              <div className="p-12 rounded-2xl border bg-card text-center text-sm text-muted-foreground">Không có hồ sơ nào.</div>
            ) : (
              <div className="rounded-2xl border bg-card divide-y">
                {shown.map(p => (
                  <div key={p.id} className={`p-4 ${testIds.has(p.id) ? TEST_ROW : ''}`}>
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <button type="button" onClick={() => setOpen(o => (o === p.id ? null : p.id))} className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          {testIds.has(p.id) && <TestBadge />}
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${CREW_REVIEW_STATUS[p.review_status].badge}`}>
                            {CREW_REVIEW_STATUS[p.review_status].label}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{p.app_count} lượt ứng tuyển</span>
                        </div>
                        <p className="mt-1 font-semibold flex items-center gap-1.5">
                          {p.full_name}
                          {p.display_name ? <span className="font-normal text-muted-foreground">· {p.display_name}</span> : null}
                          <ChevronDown className={`w-4 h-4 transition-transform ${open === p.id ? 'rotate-180' : ''}`} />
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[crewPrimaryRoleText(p), p.public_email, new Date(p.created_at).toLocaleDateString('vi-VN')].filter(Boolean).join(' · ')}
                        </p>
                      </button>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {busyId === p.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        <ImpersonateButton kind="crew" id={p.id} disabled={!p.auth_user_id} className="h-8 whitespace-nowrap" />
                        {canEdit && p.review_status !== 'approved' && (
                          <button onClick={() => review(p, 'approved')} disabled={busyId === p.id} className="h-8 inline-flex items-center gap-1 px-2.5 rounded-lg bg-[#1d1d1f] text-white text-xs font-semibold">
                            <LockOpen className="w-3.5 h-3.5" /> {p.review_status === 'pending' ? 'Kích hoạt' : 'Mở khoá'}
                          </button>
                        )}
                        {canEdit && p.review_status !== 'rejected' && (
                          <button
                            onClick={() => window.confirm(`Khoá tài khoản ekip của ${p.full_name}? Nhà tuyển dụng sẽ không thấy hồ sơ này và tài khoản không ứng tuyển được.`) && review(p, 'rejected')}
                            disabled={busyId === p.id}
                            className="h-8 inline-flex items-center gap-1 px-2.5 rounded-lg border text-xs font-semibold hover:bg-muted"
                          >
                            <Lock className="w-3.5 h-3.5" /> Khoá
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => remove(p)}
                            disabled={busyId === p.id}
                            title="Xoá ứng viên ekip"
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {open === p.id && (
                      <div className="mt-4 rounded-xl border bg-background p-4 space-y-4">
                        <CrewProfileDetails p={p} />
                        <CrewFiles id={p.id} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PermissionGuard>
  );
}

type CvRow = { id: string; title: string; source: 'file' | 'link' | 'text'; url: string | null; body: string | null; is_default: boolean; created_at: string };
type AppRow = { id: string; created_at: string; title: string; company: string; attachments: CrewAttachments | null };

/** Kho CV, cover letter + các lượt ứng tuyển (kèm CV / cover letter đã nộp) của 1 ứng viên ekip. */
function CrewFiles({ id }: { id: string }) {
  const [data, setData] = useState<{ cvs: CvRow[]; covers: CvRow[]; portfolios: CvRow[]; applications: AppRow[] } | null>(null);
  const [problem, setProblem] = useState('');
  useEffect(() => {
    authedFetch(`/api/admin/crew-profiles/${id}`)
      .then(async r => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) return setProblem(b.error || 'Không tải được CV.');
        setData({ cvs: b.cvs || [], covers: b.covers || [], portfolios: b.portfolios || [], applications: b.applications || [] });
      })
      .catch(() => setProblem('Mất kết nối mạng.'));
  }, [id]);
  if (problem) return <p className="text-xs text-destructive">{problem}</p>;
  if (!data) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  const head = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';
  return (
    <div className="grid gap-4 md:grid-cols-2 border-t pt-4">
      <div className="space-y-4">
        {(['cvs', 'portfolios', 'covers'] as const).map(k => (
          <div key={k}>
            <p className={head}>
              {k === 'cvs' ? 'Kho CV' : k === 'portfolios' ? 'Kho Portfolio' : 'Cover letter'} · {data[k].length}
            </p>
            {data[k].length === 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">Chưa có.</p>
            ) : (
              <ul className="mt-1.5 space-y-1.5">
                {data[k].map(c => (
                  <li key={c.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      {c.source === 'link' ? <Link2 className="w-4 h-4 shrink-0" /> : <FileText className="w-4 h-4 shrink-0" />}
                      {c.url ? (
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="truncate font-medium hover:underline inline-flex items-center gap-1">
                          {c.title} <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="truncate font-medium">{c.title}</span>
                      )}
                      {c.is_default && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#1d1d1f] text-white">Mặc định</span>}
                    </div>
                    {c.source === 'text' && c.body && <p className="mt-1 pl-6 text-xs text-muted-foreground whitespace-pre-line line-clamp-4">{c.body}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <div>
        <p className={head}>Đã ứng tuyển · {data.applications.length}</p>
        {data.applications.length === 0 ? (
          <p className="mt-1.5 text-xs text-muted-foreground">Chưa ứng tuyển tin nào.</p>
        ) : (
          <ul className="mt-1.5 space-y-3">
            {data.applications.map(a => (
              <li key={a.id} className="space-y-1.5">
                <p className="text-sm font-semibold">
                  {a.title}
                  <span className="font-normal text-muted-foreground">
                    {' '}
                    · {[a.company, new Date(a.created_at).toLocaleDateString('vi-VN')].filter(Boolean).join(' · ')}
                  </span>
                </p>
                <CrewAttachmentsBlock a={a.attachments} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
