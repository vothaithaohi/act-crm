'use client';

import { useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { getImpersonation, signOutAndGo } from '@/lib/dienvienvn/actor-auth';

/** Nút đăng xuất: đổi ngay sang "Đang đăng xuất…", xong thì tải lại trang đích. */
export function LogoutButton({ to, className = '', icon = true }: { to: string; className?: string; icon?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (getImpersonation()) return void signOutAndGo(to);
        setBusy(true);
        await signOutAndGo(to);
      }}
      className={className}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon ? <LogOut className="h-4 w-4" /> : null}
      {busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
    </button>
  );
}
