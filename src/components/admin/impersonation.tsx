'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2, UserRoundSearch, X } from 'lucide-react';
import { authedFetch } from '@/lib/supabase/authed-fetch';
import { useCRM } from '@/lib/store/crm-context';

// Giả lập dienvienvn.com bằng tài khoản test của chính Super Admin + đánh dấu TEST mọi dữ liệu của tài khoản test.

type Kind = 'actor' | 'partner' | 'crew';
type Session = { id: string; target_kind: Kind; target_label: string | null; created_at: string; last_seen_at: string | null };
type Item = { table: string; id: string; action: 'created' | 'updated'; label: string; crm_url: string; visible_to_producer: boolean };
const KIND: Record<Kind, string> = { actor: 'Diễn viên', partner: 'Đối tác', crew: 'Ứng viên ekip' };
const CHANGED = 'act-impersonation-changed';

/* ---------------- Đánh dấu TEST ---------------- */

export type MarkTable = 'project_applications' | 'casting_projects' | 'crew_jobs' | 'crew_profiles' | 'crew_applications' | 'talent_profiles' | 'partner_accounts';
let marksCache: Promise<Record<string, Set<string>>> | null = null;
let marksAt = 0;

function loadMarks(): Promise<Record<string, Set<string>>> {
  if (!marksCache || Date.now() - marksAt > 60_000) {
    marksAt = Date.now();
    marksCache = authedFetch('/api/admin/impersonation?marks=1', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : {}))
      .then((b: { marks?: Record<string, string[]> }) => Object.fromEntries(Object.entries(b.marks || {}).map(([k, v]) => [k, new Set(v)])))
      .catch(() => ({}));
  }
  return marksCache;
}

/** Mã các dòng thuộc tài khoản test của Super Admin (để tô nổi + gắn nhãn TEST). */
export function useTestMarks(table: MarkTable): Set<string> {
  const [set, setSet] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    let alive = true;
    const read = () => loadMarks().then(m => alive && setSet(m[table] || new Set()));
    read();
    const refresh = () => {
      marksCache = null;
      read();
    };
    window.addEventListener(CHANGED, refresh);
    return () => {
      alive = false;
      window.removeEventListener(CHANGED, refresh);
    };
  }, [table]);
  return set;
}

/** Nền hổ phách cho dòng TEST. */
export const TEST_ROW = 'bg-amber-50 ring-1 ring-inset ring-amber-300';

/** Nút lọc "Chỉ hiện TEST" (ẩn khi không có dữ liệu test). */
export function TestFilter({ count, on, onChange }: { count: number; on: boolean; onChange: (v: boolean) => void }) {
  if (!count && !on) return null;
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`h-8 px-3 rounded-full border text-xs font-semibold whitespace-nowrap ${on ? 'bg-amber-400 border-amber-500 text-amber-950' : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'}`}
    >
      Chỉ hiện TEST · {count}
    </button>
  );
}

export function TestBadge({ className = '' }: { className?: string }) {
  return (
    <span
      title="Dữ liệu test (tài khoản giả lập của Super Admin) — kiểm tra và xoá nếu không cần"
      className={`inline-flex shrink-0 items-center rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-amber-950 ${className}`}
    >
      Test
    </span>
  );
}

/* ---------------- Mục giả lập trong menu tài khoản ---------------- */

const MENU: { kind: Kind; label: string }[] = [
  { kind: 'actor', label: 'Diễn viên' },
  { kind: 'partner', label: 'Nhà sản xuất' },
  { kind: 'crew', label: 'Ứng viên ekip' }
];

/** Super Admin mở dienvienvn.com bằng tài khoản test của chính mình theo vai (thao tác là thật, CRM đánh dấu TEST). */
export function ImpersonateMenu({ onPicked }: { onPicked?: () => void }) {
  const { realRole, viewAsRole } = useCRM();
  const [busy, setBusy] = useState<Kind | null>(null);
  if (realRole !== 'super_admin' || viewAsRole) return null;
  const start = async (kind: Kind) => {
    // Mở tab trước (trình duyệt chặn popup nếu mở sau khi chờ mạng)
    const tab = window.open('about:blank', '_blank');
    setBusy(kind);
    try {
      const res = await authedFetch('/api/admin/impersonation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind }) });
      const b = await res.json().catch(() => ({}));
      if (!res.ok || !b.url) {
        tab?.close();
        alert(b.mode === 'demo' ? 'Chế độ demo không giả lập được.' : b.error || 'Không mở được phiên giả lập.');
        return;
      }
      if (tab) tab.location.href = b.url;
      else window.location.href = b.url;
      window.dispatchEvent(new Event(CHANGED));
      onPicked?.();
    } catch {
      tab?.close();
      alert('Mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="px-2 pt-1.5 pb-1 border-b border-border/60">
      <p className="px-2.5 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Giả lập tài khoản</p>
      {MENU.map(m => (
        <button
          key={m.kind}
          type="button"
          disabled={!!busy}
          onClick={() => start(m.kind)}
          className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-60"
        >
          <span className="flex items-center gap-2">
            <UserRoundSearch className="w-3.5 h-3.5 text-amber-600" />
            {m.label}
          </span>
          {busy === m.kind && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Banner phiên đang mở ---------------- */

const time = (iso: string) => new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

/** Đặt ở đầu CRM: các phiên giả lập đang mở của Super Admin này + nút Kết thúc (kèm tóm tắt thao tác thật cần xoá). */
export function ImpersonationBanner() {
  const { realRole } = useCRM();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [summary, setSummary] = useState<{ id: string; label: string; items: Item[] } | null>(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    authedFetch('/api/admin/impersonation', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { sessions: [] }))
      .then(b => setSessions(Array.isArray(b.sessions) ? b.sessions : []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (realRole !== 'super_admin') return;
    load();
    // Phiên mở ở tab khác mất vài giây mới đổi mã xong
    const onChanged = () => [3000, 10000].forEach(ms => setTimeout(load, ms));
    window.addEventListener(CHANGED, onChanged);
    window.addEventListener('focus', load);
    return () => {
      window.removeEventListener(CHANGED, onChanged);
      window.removeEventListener('focus', load);
    };
  }, [realRole, load]);

  const end = async (s: Session) => {
    setBusy(s.id);
    try {
      const res = await authedFetch(`/api/admin/impersonation?id=${s.id}`, { method: 'DELETE' });
      const b = await res.json().catch(() => ({}));
      setSummary({ id: s.id, label: s.target_label || KIND[s.target_kind], items: Array.isArray(b.items) ? b.items : [] });
      setSessions(list => list.filter(x => x.id !== s.id));
      marksCache = null;
      window.dispatchEvent(new Event(CHANGED));
    } finally {
      setBusy('');
    }
  };

  if (realRole !== 'super_admin') return null;
  return (
    <>
      {sessions.map(s => (
        <div key={s.id} className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-amber-400 bg-amber-400 px-4 py-2 text-xs text-amber-950">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-900 opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-900" />
          </span>
          <span>
            Đang giả lập <strong>{s.target_label || ''}</strong> · {KIND[s.target_kind]} · từ {time(s.created_at)} · thao tác trên dienvienvn.com là thật
          </span>
          <button type="button" onClick={() => end(s)} disabled={busy === s.id} className="rounded-full bg-amber-950 px-3 py-1 font-semibold text-amber-50 hover:bg-black disabled:opacity-60">
            {busy === s.id ? 'Đang kết thúc…' : 'Kết thúc giả lập'}
          </button>
        </div>
      ))}
      {summary && <SummaryDialog id={summary.id} label={summary.label} items={summary.items} onClose={() => setSummary(null)} />}
    </>
  );
}

function SummaryDialog({ id, label, items, onClose }: { id: string; label: string; items: Item[]; onClose: () => void }) {
  const forProducer = items.filter(i => i.visible_to_producer).length;
  const [purging, setPurging] = useState(false);
  const [purged, setPurged] = useState<{ removed: number; failed: number } | null>(null);
  const purge = async () => {
    if (!window.confirm(`Xoá toàn bộ ${items.length} thao tác của phiên giả lập này? Không hoàn tác được.`)) return;
    setPurging(true);
    try {
      const res = await authedFetch(`/api/admin/impersonation?id=${id}&purge=1`, { method: 'DELETE' });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) return alert(b.error || 'Không xoá được.');
      setPurged({ removed: Number(b.removed) || 0, failed: Number(b.failed) || 0 });
      marksCache = null;
      window.dispatchEvent(new Event(CHANGED));
    } finally {
      setPurging(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-background p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">Đã kết thúc giả lập {label}.</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="-mr-2 -mt-1 rounded-full p-2 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        {purged ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Đã xoá toàn bộ dữ liệu test của phiên này{purged.failed ? ` (${purged.failed} mục chưa xoá được — kiểm tra lại)` : ''}. Tải lại trang để cập nhật danh sách.
          </p>
        ) : items.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Trong phiên này chưa có thao tác thật nào được lưu.</p>
        ) : (
          <>
            <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Đã thao tác thật {items.length} mục{forProducer ? `, ${forProducer} mục NSX đang thấy (link shortlist / trang tuyển dụng)` : ''}. Nên xoá để tránh loãng / hiểu nhầm. Nếu giữ lại, các mục này được
                gắn nhãn <b>TEST</b> trong CRM.
              </p>
            </div>
            <ul className="mt-3 divide-y">
              {items.map(i => (
                <li key={`${i.table}-${i.id}-${i.action}`} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0 text-sm">
                    {i.label}
                    {i.visible_to_producer && <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">NSX thấy</span>}
                  </div>
                  <a href={i.crm_url.replace(/^https?:\/\/[^/]+/, '')} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline" onClick={onClose}>
                    Mở
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="mt-5 flex justify-end gap-2">
          {!purged && items.length > 0 && (
            <button type="button" onClick={purge} disabled={purging} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60">
              {purging && <Loader2 className="h-4 w-4 animate-spin" />}
              Xoá toàn bộ dữ liệu test
            </button>
          )}
          <button type="button" onClick={purged ? () => window.location.reload() : onClose} className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background">
            {purged ? 'Tải lại trang' : items.length ? 'Giữ lại, xoá sau' : 'Đã hiểu'}
          </button>
        </div>
      </div>
    </div>
  );
}
