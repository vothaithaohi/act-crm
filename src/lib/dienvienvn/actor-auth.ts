'use client';

// Phiên đăng nhập của diễn viên trên DienVienVN — tách biệt với phiên nhân sự CRM
// (khoá lưu trữ riêng), nên đăng nhập bên này không ảnh hưởng tài khoản CRM và ngược lại.
import { useEffect, useState } from 'react';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

/** null khi chưa cấu hình Supabase (chế độ demo). */
export function actorClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client =
    url && anon && typeof window !== 'undefined'
      ? createClient(url, anon, {
          auth: {
            storageKey: 'dvvn-actor-auth',
            flowType: 'implicit',
            detectSessionInUrl: false,
            persistSession: true,
            autoRefreshToken: true
          }
        })
      : null;
  return client;
}

export class AuthRequiredError extends Error {
  constructor(message = 'Vui lòng đăng nhập.') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

/** fetch kèm access token của diễn viên đang đăng nhập. */
export async function actorFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const c = actorClient();
  if (c) {
    const { data } = await c.auth.getSession();
    if (data.session?.access_token) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }
  return fetch(input, { ...init, headers, cache: 'no-store' });
}

export type ActorSessionState =
  | { status: 'loading'; session: null }
  | { status: 'signed-in'; session: Session }
  | { status: 'signed-out'; session: null }
  /** Chưa cấu hình Supabase (chế độ demo): không có tài khoản diễn viên. */
  | { status: 'unavailable'; session: null };

export function useActorSession(): ActorSessionState {
  const [state, setState] = useState<ActorSessionState>({ status: 'loading', session: null });

  useEffect(() => {
    const c = actorClient();
    if (!c) {
      setState({ status: 'unavailable', session: null });
      return;
    }
    const apply = (s: Session | null) => setState(s ? { status: 'signed-in', session: s } : { status: 'signed-out', session: null });
    c.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = c.auth.onAuthStateChange((_event, s) => apply(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return state;
}

export async function signOutActor() {
  await actorClient()?.auth.signOut();
}
