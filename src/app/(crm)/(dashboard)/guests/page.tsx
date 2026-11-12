'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileUp, Loader2, Mic, Plus, Search, Star } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { ImportGuestsModal } from '@/components/guests/import-guests-modal';
import { useCRM } from '@/lib/store/crm-context';
import { useGuests } from '@/lib/guests/use-guests';
import { INVITATION_STATUS, INVITATION_STATUS_LIST, InvitationStatus, foldVi, guestStats, termNumber } from '@/lib/guests/types';

export default function GuestsPage() {
  const router = useRouter();
  const { currentUser, can } = useCRM();
  const canEdit = can('talents:write');
  const { guests, invitations, reviews, loading, problem, importGuests } = useGuests();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('all');
  const [status, setStatus] = useState<'all' | InvitationStatus>('all');
  const [onlyFuture, setOnlyFuture] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const terms = useMemo(() => Array.from(new Set(invitations.map(i => i.term))).sort((a, b) => termNumber(b) - termNumber(a)), [invitations]);
  const byGuest = useMemo(() => {
    const m = new Map<string, typeof invitations>();
    invitations.forEach(i => m.set(i.guest_id, [...(m.get(i.guest_id) || []), i]));
    return m;
  }, [invitations]);
  const reviewsByGuest = useMemo(() => {
    const m = new Map<string, typeof reviews>();
    reviews.forEach(r => m.set(r.guest_id, [...(m.get(r.guest_id) || []), r]));
    return m;
  }, [reviews]);

  const rows = useMemo(() => {
    const words = foldVi(q.trim()).split(/\s+/).filter(Boolean);
    return guests
      .map(g => {
        const invs = byGuest.get(g.id) || [];
        const termInvs = term === 'all' ? invs : invs.filter(i => i.term === term);
        // Trạng thái tốt nhất của khách trong Term đang lọc (VD: đã tham dự > đã nhận lời > …)
        const best = termInvs.slice().sort((a, b) => INVITATION_STATUS[a.status].order - INVITATION_STATUS[b.status].order)[0];
        return { g, invs, termInvs, best, stats: guestStats(invs), revs: reviewsByGuest.get(g.id) || [] };
      })
      .filter(({ g, termInvs }) => {
        const text = foldVi([g.full_name, g.call_name, g.title, g.phone, g.email, g.bio].filter(Boolean).join(' '));
        if (words.some(w => !text.includes(w))) return false;
        if (onlyFuture && !g.contact_future) return false;
        if (term !== 'all' && termInvs.length === 0) return false;
        if (status !== 'all' && !termInvs.some(i => i.status === status)) return false;
        return true;
      });
  }, [guests, byGuest, reviewsByGuest, q, term, status, onlyFuture]);

  const attendedAny = guests.filter(g => (byGuest.get(g.id) || []).some(i => i.status === 'success')).length;
  const latest = terms[0];
  const latestConfirmed = latest ? new Set(invitations.filter(i => i.term === latest && (i.status === 'confirmed' || i.status === 'success')).map(i => i.guest_id)).size : 0;
  const selectCls = 'h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:border-foreground';

  return (
    <PermissionGuard permissions={['talents:write', 'guests:read']} customTitle="Khách mời showcase" customMessage="Danh sách khách mời chỉ dành cho Ban Giám Đốc và bộ phận Casting.">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
              <Mic className="w-6 h-6" /> Khách mời showcase
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Đạo diễn, nhà sản xuất, giảng viên mời làm khách mời / giám khảo showcase. Chỉ dùng nội bộ, không hiện trên dienvienvn.com.
            </p>
          </div>
          {canEdit && (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setImportOpen(true)} className="h-10 inline-flex items-center gap-2 px-4 rounded-xl border text-xs font-semibold hover:bg-muted">
              <FileUp className="w-4 h-4" /> Nhập từ Excel
            </button>
            <Link href="/guests/new" className="h-10 inline-flex items-center gap-2 px-4 rounded-xl bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold">
              <Plus className="w-4 h-4" /> Thêm khách mời
            </Link>
          </div>
          )}
        </div>

        {problem && <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">{problem}</div>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Khách mời', guests.length],
            ['Đã từng tham dự', attendedAny],
            [latest ? `Nhận lời ${latest}` : 'Term gần nhất', latestConfirmed],
            ['Nhận xét', reviews.length]
          ].map(([label, value]) => (
            <div key={label as string} className="p-4 bg-card rounded-2xl border">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
            </div>
          ))}
        </div>

        <div className="p-3 bg-card rounded-2xl border flex flex-col lg:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm tên, chức danh, SĐT, email…" className={`${selectCls} w-full pl-9`} />
          </div>
          <select value={term} onChange={e => setTerm(e.target.value)} className={selectCls} aria-label="Term">
            <option value="all">Mọi Term</option>
            {terms.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value as typeof status)} className={selectCls} aria-label="Trạng thái">
            <option value="all">Mọi trạng thái</option>
            {INVITATION_STATUS_LIST.map(s => (
              <option key={s} value={s}>
                {INVITATION_STATUS[s].label}
              </option>
            ))}
          </select>
          <label className="h-10 inline-flex items-center gap-2 px-3 rounded-lg border text-sm cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={onlyFuture} onChange={e => setOnlyFuture(e.target.checked)} className="accent-[#1d1d1f]" /> Liên hệ tiếp
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : guests.length === 0 ? (
          <div className="p-12 rounded-2xl border bg-card text-center">
            <Mic className="w-8 h-8 mx-auto text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-3 font-semibold">Chưa có khách mời nào</p>
            {canEdit && <p className="mt-1 text-sm text-muted-foreground">Bấm &ldquo;Nhập từ Excel&rdquo; để đưa danh sách cũ vào, hoặc &ldquo;Thêm khách mời&rdquo;.</p>}
          </div>
        ) : (
          <div className="rounded-2xl border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
                  <th className="px-4 py-3 font-semibold">Khách mời</th>
                  <th className="px-4 py-3 font-semibold">Liên hệ</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Đã tham dự</th>
                  <th className="px-4 py-3 font-semibold">{term === 'all' ? 'Gần nhất' : term}</th>
                  <th className="px-4 py-3 font-semibold">Nhận xét</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ g, invs, termInvs, best, stats, revs }) => {
                  const shown = term === 'all' ? invs.slice().sort((a, b) => termNumber(b.term) - termNumber(a.term) || INVITATION_STATUS[a.status].order - INVITATION_STATUS[b.status].order)[0] : best;
                  const rated = revs.filter(r => r.rating);
                  const avg = rated.length ? rated.reduce((n, r) => n + (r.rating || 0), 0) / rated.length : null;
                  return (
                    <tr key={g.id} onClick={() => router.push(`/guests/${g.id}`)} className="border-b last:border-0 cursor-pointer hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{g.full_name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{g.title || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div>{g.phone || '—'}</div>
                        <div className="text-muted-foreground truncate max-w-[220px]">{g.email || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span className="font-semibold text-sm">{stats.attended}</span> lần
                        {stats.declined > 0 && <span className="text-muted-foreground"> · từ chối {stats.declined}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {shown ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full border font-semibold ${INVITATION_STATUS[shown.status].badge}`}>{INVITATION_STATUS[shown.status].label}</span>
                            {term === 'all' && <span className="text-muted-foreground">{shown.term}</span>}
                            {term !== 'all' && termInvs.length > 1 && <span className="text-muted-foreground">{termInvs.length} buổi</span>}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {revs.length ? (
                          <span className="inline-flex items-center gap-1">
                            {avg !== null && (
                              <>
                                <Star className="w-3.5 h-3.5 fill-[#c9a063] text-[#c9a063]" /> {avg.toFixed(1)} ·
                              </>
                            )}{' '}
                            {revs.length} nhận xét
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Không có khách mời phù hợp bộ lọc.</p>}
          </div>
        )}
      </div>

      {importOpen && <ImportGuestsModal onClose={() => setImportOpen(false)} onImport={items => importGuests(items, currentUser?.email || null)} />}
    </PermissionGuard>
  );
}
