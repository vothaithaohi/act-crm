'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { getImpersonation, useAccountRole } from '@/lib/dienvienvn/actor-auth';
import { ZALO_GROUP_URL } from './landing-page';

// Diễn viên đăng nhập: nhắc tham gia nhóm Zalo cộng đồng. "Để sau" → nhắc lại sau 7 ngày; đã bấm tham gia → không nhắc nữa.
const KEY = 'dvvn-zalo-prompt';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function shouldShow(): boolean {
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === 'joined') return false;
    return !v || Number(v) < Date.now();
  } catch {
    return false;
  }
}
function remember(v: string) {
  try {
    window.localStorage.setItem(KEY, v);
  } catch {
    /* bỏ qua */
  }
}

export function CommunityPrompt() {
  const role = useAccountRole();
  const path = usePathname() || '';
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Không chen vào lúc đang tạo mật khẩu / đang giả lập
    if (role !== 'actor' || /\/(tao-mat-khau|gia-lap)(\/|$)/.test(path) || getImpersonation()) return;
    if (!shouldShow()) return;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [role, path]);

  if (!open) return null;
  const later = () => {
    remember(String(Date.now() + SNOOZE_MS));
    setOpen(false);
  };
  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] flex justify-center p-3 sm:bottom-6 sm:p-0" role="dialog" aria-label="Tham gia nhóm Zalo cộng đồng">
      <div className="relative w-full max-w-[420px] rounded-[20px] bg-white p-5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06]">
        <button type="button" onClick={later} aria-label="Đóng" className="absolute right-3 top-3 rounded-full p-1.5 text-[var(--dv-text-secondary)] hover:bg-[var(--dv-bg-alt)]">
          <X className="h-4 w-4" />
        </button>
        <p className="pr-8 text-[17px] font-semibold leading-[1.3]">Tham gia nhóm cộng đồng trên Zalo</p>
        <p className="mt-1.5 text-[15px] leading-[1.45] text-[var(--dv-text-secondary)]">Để được hỗ trợ và nhận thông tin casting nhanh chóng.</p>
        <div className="mt-4 flex gap-2">
          <a
            href={ZALO_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              remember('joined');
              setOpen(false);
            }}
            className="dv-btn dv-btn-primary !h-10 flex-1 !py-0 text-[15px]"
          >
            Tham gia nhóm Zalo
          </a>
          <button type="button" onClick={later} className="dv-btn dv-btn-secondary !h-10 !py-0 text-[15px]">
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
}
