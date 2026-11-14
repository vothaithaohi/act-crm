'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ExternalLink, Loader2, LogOut, X } from 'lucide-react';
import { IMP_EXIT_EVENT, actorFetch, getImpersonation, setImpersonation, useImpersonation } from '@/lib/dienvienvn/actor-auth';
import { useDvvnHref } from './base-path';

// Giả lập tài khoản (Super Admin mở từ CRM): khung viền + nút nổi "Đang giả lập · Thoát",
// hộp thoát liệt kê các thao tác thật đã làm để xoá trong CRM.

const KIND: Record<string, string> = { actor: 'Diễn viên', partner: 'Đối tác', crew: 'Ứng viên ekip' };
const HOME: Record<string, string> = { actor: '/tai-khoan', partner: '/doi-tac', crew: '/tai-khoan/ekip' };

type Item = { table: string; id: string; action: 'created' | 'updated'; label: string; crm_url: string; visible_to_producer: boolean };

/** /gia-lap?code=…: đổi mã dùng 1 lần lấy phiên giả lập rồi mở trang tài khoản. */
export function ImpersonationStart() {
  const params = useSearchParams();
  const href = useDvvnHref();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = params.get('code') || '';
    const next = params.get('next') || '';
    window.history.replaceState(null, '', window.location.pathname);
    (async () => {
      const res = await fetch('/api/dienvienvn/impersonation/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        cache: 'no-store'
      });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) return setError(b.error || 'Không mở được phiên giả lập.');
      setImpersonation({
        token: b.token,
        sessionId: b.session_id,
        kind: b.kind,
        label: b.label,
        userId: b.user_id,
        email: b.email,
        adminEmail: b.admin_email,
        startedAt: b.started_at
      });
      const path = /^\/[a-z0-9/-]*$/i.test(next) ? next : HOME[b.kind] || '/';
      window.location.replace(href(path));
    })().catch(() => setError('Mất kết nối mạng. Vui lòng thử lại.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="dv-card w-full max-w-[420px] p-8 text-center">
        {error ? (
          <>
            <h1 className="dv-display text-[22px] font-semibold">Không mở được giả lập.</h1>
            <p className="mt-3 text-[15px] leading-[1.47] text-[var(--dv-text-secondary)]">{error}</p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--dv-text-secondary)]" />
            <p className="mt-4 text-[15px] text-[var(--dv-text-secondary)]">Đang mở phiên giả lập…</p>
          </>
        )}
      </div>
    </div>
  );
}

/** Đặt trong layout: chỉ hiện khi đang giả lập. */
export function ImpersonationBar() {
  const imp = useImpersonation();
  const href = useDvvnHref();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => getImpersonation() && setOpen(true);
    window.addEventListener(IMP_EXIT_EVENT, show);
    return () => window.removeEventListener(IMP_EXIT_EVENT, show);
  }, []);

  if (!imp && !open) return null;
  return (
    <>
      {imp && (
        <>
          {/* Viền màu hổ phách quanh màn hình: luôn nhớ đang giả lập, không che nội dung */}
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] shadow-[inset_0_0_0_3px_#f59e0b]" />
          <div className="fixed bottom-[calc(16px+env(safe-area-inset-bottom))] left-4 z-[91] max-sm:bottom-[calc(84px+env(safe-area-inset-bottom))] max-sm:left-3">
            <div className="flex items-center gap-1 rounded-full bg-[#1d1d1f] py-1 pl-3 pr-1 text-white shadow-[0_6px_24px_rgba(0,0,0,0.25)] ring-2 ring-[#f59e0b]">
              <span className="relative mr-1 flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f59e0b] opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f59e0b]" />
              </span>
              <span className="max-w-[46vw] truncate text-[13px] sm:max-w-[280px]">
                <span className="font-semibold text-[#fbbf24]">Đang giả lập</span>
                <span className="text-white/80"> · {imp.label} · {KIND[imp.kind] || ''}</span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#f59e0b] px-3 py-1.5 text-[13px] font-semibold text-[#1d1d1f] hover:bg-[#fbbf24]"
              >
                <LogOut className="h-3.5 w-3.5" />
                Thoát
              </button>
            </div>
          </div>
        </>
      )}
      {open && <ExitDialog onClose={() => setOpen(false)} onDone={() => window.location.replace(href('/'))} />}
    </>
  );
}

function ExitDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [phase, setPhase] = useState<'review' | 'ending' | 'ended'>('review');
  const [error, setError] = useState('');

  useEffect(() => {
    actorFetch('/api/dienvienvn/impersonation')
      .then(async res => {
        const b = await res.json().catch(() => ({}));
        setItems(Array.isArray(b.items) ? b.items : []);
      })
      .catch(() => setItems([]));
  }, []);

  const end = async () => {
    setPhase('ending');
    setError('');
    try {
      const res = await actorFetch('/api/dienvienvn/impersonation/end', { method: 'POST' });
      const b = await res.json().catch(() => ({}));
      if (Array.isArray(b.items)) setItems(b.items);
      setImpersonation(null);
      setPhase('ended');
    } catch {
      setPhase('review');
      setError('Mất kết nối mạng. Vui lòng thử lại.');
    }
  };

  const list = items || [];
  const forProducer = list.filter(i => i.visible_to_producer).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-[20px] bg-[var(--dv-bg,#fff)] p-6 text-[var(--dv-text)] shadow-xl sm:max-w-[520px] sm:rounded-[20px]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="dv-display text-[21px] font-semibold">{phase === 'ended' ? 'Đã thoát giả lập.' : 'Thoát giả lập?'}</h2>
          {phase !== 'ended' && (
            <button type="button" onClick={onClose} aria-label="Đóng" className="-mr-2 -mt-1 rounded-full p-2 text-[var(--dv-text-secondary)] hover:bg-black/5">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {items === null ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-[var(--dv-text-secondary)]" />
          </div>
        ) : list.length === 0 ? (
          <p className="mt-3 text-[15px] leading-[1.5] text-[var(--dv-text-secondary)]">Trong phiên này chưa có thao tác thật nào được lưu.</p>
        ) : (
          <>
            <div className="mt-3 flex gap-2 rounded-[12px] bg-[#fef3c7] p-3 text-[14px] leading-[1.45] text-[#78350f]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Bạn đã thao tác thật {list.length} mục{forProducer ? `, ${forProducer} mục đang hiện với NSX (link shortlist / trang tuyển dụng)` : ''}. Hãy xoá trong CRM để
                không làm loãng / hiểu nhầm dữ liệu. Các mục này được đánh dấu <b>TEST</b> trong CRM.
              </p>
            </div>
            <ul className="mt-3 divide-y divide-[var(--dv-border,#e5e5ea)]">
              {list.map(i => (
                <li key={`${i.table}-${i.id}-${i.action}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[14px] leading-[1.4]">{i.label}</p>
                    {i.visible_to_producer && <span className="mt-0.5 inline-block rounded-full bg-[#fde68a] px-2 py-0.5 text-[11px] font-semibold text-[#78350f]">NSX thấy</span>}
                  </div>
                  <a href={i.crm_url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-[var(--dv-link,#0066cc)] hover:underline">
                    Mở CRM
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}

        {error && <p className="mt-3 text-[14px] text-[#d70015]">{error}</p>}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {phase === 'ended' ? (
            <button type="button" onClick={onDone} className="dv-btn dv-btn-primary">
              Về trang chủ
            </button>
          ) : (
            <>
              <button type="button" onClick={onClose} className="dv-btn dv-btn-secondary">
                Tiếp tục giả lập
              </button>
              <button type="button" onClick={end} disabled={phase === 'ending'} className="dv-btn dv-btn-primary">
                {phase === 'ending' && <Loader2 className="h-4 w-4 animate-spin" />}
                Kết thúc giả lập
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
