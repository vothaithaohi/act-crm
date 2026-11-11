'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ExternalLink, Loader2, X } from 'lucide-react';
import type { PublicTalent } from '@/lib/dienvienvn/public-talents';
import type { PartnerTalent } from '@/lib/dienvienvn/partners';
import { actorFetch, useActorSession } from '@/lib/dienvienvn/actor-auth';
import { useDvvnHref } from './base-path';
import { TalentProfileBody } from './talent-profile-view';

/** Tham số trên đường dẫn để mở sẵn cửa sổ hồ sơ (VD: nút "Xem như nhà sản xuất" trong CRM). */
export const DRAWER_PARAM = 'ho-so';

type Ctx = { open: (username: string) => void };
const DrawerContext = createContext<Ctx | null>(null);

/** Hồ sơ công khai + (nếu là đối tác đã duyệt đang đăng nhập) phần liên hệ / số đo cấp đối tác. */
function useTalentData(username: string | null) {
  const session = useActorSession();
  const [state, setState] = useState<{ talent?: PublicTalent; partner?: PartnerTalent | null; error?: string } | null>(null);
  useEffect(() => {
    if (!username || session.status === 'loading') return;
    let cancelled = false;
    setState(null);
    (async () => {
      const res = await fetch(`/api/dienvienvn/talents/${encodeURIComponent(username)}`, { cache: 'no-store' });
      const body = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok || !body.talent) {
        return setState({ error: body.error || 'Hồ sơ này chưa hiện công khai (chưa duyệt, đã ẩn hoặc là tài khoản test).' });
      }
      let partner: PartnerTalent | null = null;
      if (session.status === 'signed-in') {
        const pr = await actorFetch(`/api/dienvienvn/partner/talents/${encodeURIComponent(username)}`).catch(() => null);
        const pb = pr && pr.ok ? await pr.json().catch(() => ({})) : null;
        partner = (pb?.talent as PartnerTalent) || null;
      }
      if (!cancelled) setState({ talent: body.talent as PublicTalent, partner });
    })().catch(() => !cancelled && setState({ error: 'Mất kết nối mạng. Vui lòng thử lại.' }));
    return () => {
      cancelled = true;
    };
  }, [username, session.status]);
  return state;
}

/** Cửa sổ hồ sơ diễn viên trượt từ bên phải sang. */
function TalentDrawer({ username, onClose }: { username: string; onClose: () => void }) {
  const href = useDvvnHref();
  const data = useTalentData(username);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/45 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={data?.talent ? `Hồ sơ ${data.talent.name}` : 'Hồ sơ diễn viên'}
        onClick={e => e.stopPropagation()}
        className="dv-slide-in-right flex h-full w-full max-w-[1080px] flex-col bg-[var(--dv-bg-alt)] shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] bg-white/90 px-3 py-2.5 backdrop-blur md:px-5">
          <button type="button" onClick={onClose} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1d1d1f] text-white hover:bg-black">
            <X className="h-5 w-5" />
          </button>
          <Link href={href(`/${username}`)} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[14px] text-[var(--dv-text-secondary)] hover:bg-[var(--dv-bg-alt)] hover:text-[var(--dv-text)]">
            Xem hồ sơ ở tab mới <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
          {!data ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--dv-text-secondary)]" />
            </div>
          ) : data.error || !data.talent ? (
            <div className="rounded-[18px] bg-white p-8 text-center text-[15px] text-[var(--dv-text-secondary)]">{data.error}</div>
          ) : (
            <TalentProfileBody talent={data.talent} partner={data.partner} />
          )}
        </div>
      </div>
    </div>
  );
}

/** Bọc toàn bộ trang DienVienVN: mọi link hồ sơ diễn viên mở cửa sổ trượt thay vì chuyển trang. */
export function TalentDrawerProvider({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const open = useCallback((u: string) => setUsername(u), []);
  const close = useCallback(() => {
    setUsername(null);
    // Bỏ ?ho-so=… khỏi đường dẫn khi đóng
    const url = new URL(window.location.href);
    if (url.searchParams.has(DRAWER_PARAM)) {
      url.searchParams.delete(DRAWER_PARAM);
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }, []);

  // Mở sẵn theo ?ho-so=username (link "Xem như nhà sản xuất" từ CRM)
  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get(DRAWER_PARAM);
    if (u && /^[a-z0-9][a-z0-9_-]{2,39}$/i.test(u)) setUsername(u.toLowerCase());
  }, []);

  return (
    <DrawerContext.Provider value={{ open }}>
      {children}
      {username && <TalentDrawer username={username} onClose={close} />}
    </DrawerContext.Provider>
  );
}

/**
 * Link tới hồ sơ diễn viên: bấm thường → mở cửa sổ trượt; Ctrl/⌘-bấm, chuột giữa → mở trang hồ sơ ở tab mới như link thường.
 */
export function TalentLink({
  username,
  children,
  className,
  tabIndex,
  'aria-hidden': ariaHidden,
  draggable
}: {
  username: string;
  children: React.ReactNode;
  className?: string;
  tabIndex?: number;
  'aria-hidden'?: boolean;
  draggable?: boolean;
}) {
  const href = useDvvnHref();
  const ctx = useContext(DrawerContext);
  return (
    <Link
      href={href(`/${username}`)}
      className={className}
      tabIndex={tabIndex}
      aria-hidden={ariaHidden}
      draggable={draggable}
      onClick={e => {
        if (!ctx || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        ctx.open(username);
      }}
    >
      {children}
    </Link>
  );
}
