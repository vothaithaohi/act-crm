'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { AudioLines, Loader2, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Khung trang Recap: đăng nhập bằng tài khoản CRM (chỉ nhân sự nội bộ dùng được).

const BaseCtx = createContext('');
/** Đường dẫn gốc: recap.dienvienvn.com → "", admin.dienvienvn.com/recap → "/recap" */
export const useRecapBase = () => useContext(BaseCtx);

export function RecapShell({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'demo' | 'out' | 'in'>('loading');
  const [email, setEmail] = useState('');
  const [base, setBase] = useState('');

  useEffect(() => {
    setBase(window.location.pathname.startsWith('/recap') ? '/recap' : '');
    const sb = createClient();
    if (!sb) {
      setState('demo');
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email || '');
      setState(data.session ? 'in' : 'out');
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email || '');
      setState(session ? 'in' : 'out');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <BaseCtx.Provider value={base}>
      <div className="min-h-screen bg-[#f5f5f7] text-foreground">
        <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4">
            <Link href={base || '/'} className="flex items-center gap-2 font-bold">
              <AudioLines className="h-5 w-5" /> Recap cuộc họp
            </Link>
            {state === 'in' && (
              <div className="flex items-center gap-3 text-sm">
                <span className="hidden text-muted-foreground sm:inline">{email}</span>
                <button
                  onClick={() => createClient()?.auth.signOut()}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium hover:bg-muted"
                >
                  <LogOut className="h-4 w-4" /> Đăng xuất
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6">
          {state === 'loading' && <Loader2 className="mx-auto mt-20 h-6 w-6 animate-spin text-muted-foreground" />}
          {state === 'demo' && <p className="mt-20 text-center text-muted-foreground">Chế độ demo chưa kết nối Supabase.</p>}
          {state === 'out' && <LoginForm />}
          {state === 'in' && children}
        </main>
      </div>
    </BaseCtx.Provider>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = createClient();
    if (!sb) return;
    setBusy(true);
    setError('');
    const { error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError('Email hoặc mật khẩu không đúng.');
  };
  return (
    <form onSubmit={submit} className="mx-auto mt-16 max-w-sm space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-xl font-bold">Đăng nhập</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dùng tài khoản CRM (admin.dienvienvn.com).</p>
      </div>
      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10" />
      <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Mật khẩu" className="h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-black text-sm font-semibold text-white disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Đăng nhập
      </button>
    </form>
  );
}
