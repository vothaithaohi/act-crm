'use client';

// Phiên đăng nhập của diễn viên trên DienVienVN — tách biệt với phiên nhân sự CRM
// (khoá lưu trữ riêng), nên đăng nhập bên này không ảnh hưởng tài khoản CRM và ngược lại.
import { useEffect, useState } from 'react';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

/** null khi chưa cấu hình Supabase (chế độ demo). */
/**
 * Gọi Supabase trực tiếp; nếu trình duyệt không kết nối được (lỗi "Failed to fetch": chặn quảng cáo,
 * trình duyệt trong Zalo / Gmail, nhà mạng chặn *.supabase.co…) thì thử lại qua chính tên miền
 * dienvienvn.com (/api/sb → Supabase, khai báo trong next.config.mjs).
 */
function fetchWithFallback(base: string): typeof fetch {
  return async (input, init) => {
    try {
      return await fetch(input, init);
    } catch (e) {
      const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      // Chỉ phần xác thực (đăng nhập, xác nhận email, đặt mật khẩu) đi đường dự phòng
      if (!u.startsWith(`${base}/auth/v1/`) || typeof window === 'undefined') throw e;
      return fetch(`${window.location.origin}/api/sb${u.slice(base.length)}`, init);
    }
  };
}

/** Lỗi do mất kết nối (không phải link hết hạn): giữ nguyên link để người dùng thử lại. */
export function isNetworkError(err: { message?: string; name?: string; status?: number } | null | undefined): boolean {
  if (!err) return false;
  return err.name === 'AuthRetryableFetchError' || /failed to fetch|network|load failed|fetch failed/i.test(err.message || '');
}

export function actorClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client =
    url && anon && typeof window !== 'undefined'
      ? createClient(url, anon, {
          global: { fetch: fetchWithFallback(url.replace(/\/$/, '')) },
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

/* ---------------- Giả lập tài khoản (Super Admin mở từ CRM) ---------------- */

export const IMPERSONATE_HEADER = 'x-dvvn-impersonate';
const IMP_KEY = 'dvvn-impersonation';
const IMP_EVENT = 'dvvn-impersonation-change';
export const IMP_EXIT_EVENT = 'dvvn-impersonation-exit';

export type ImpersonationState = {
  token: string;
  sessionId: string;
  kind: 'actor' | 'partner' | 'crew';
  label: string;
  userId: string;
  email: string;
  adminEmail: string;
  startedAt: string;
};

/** Phiên giả lập đang mở trong trình duyệt này (null = không giả lập). */
export function getImpersonation(): ImpersonationState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(IMP_KEY);
    const v = raw ? (JSON.parse(raw) as ImpersonationState) : null;
    return v && typeof v.token === 'string' && v.userId ? v : null;
  } catch {
    return null;
  }
}

export function setImpersonation(v: ImpersonationState | null) {
  try {
    if (v) window.localStorage.setItem(IMP_KEY, JSON.stringify(v));
    else window.localStorage.removeItem(IMP_KEY);
  } catch {
    /* bỏ qua */
  }
  window.dispatchEvent(new Event(IMP_EVENT));
}

/** Theo dõi phiên giả lập (kể cả khi đổi ở tab khác). */
export function useImpersonation(): ImpersonationState | null {
  const [v, setV] = useState<ImpersonationState | null>(null);
  useEffect(() => {
    const read = () => setV(getImpersonation());
    read();
    const onStorage = (e: StorageEvent) => (e.key === IMP_KEY || e.key === null) && read();
    window.addEventListener(IMP_EVENT, read);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(IMP_EVENT, read);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return v;
}

/** Phiên giả lập giả làm phiên đăng nhập của tài khoản được giả lập (chỉ để trang biết "đã đăng nhập"). */
function impersonatedSession(v: ImpersonationState): Session {
  return {
    access_token: '',
    refresh_token: '',
    token_type: 'bearer',
    expires_in: 0,
    user: { id: v.userId, email: v.email, aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: v.startedAt }
  } as Session;
}

/** fetch kèm access token của diễn viên đang đăng nhập (đang giả lập: kèm mã phiên giả lập thay cho token). */
export async function actorFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const imp = getImpersonation();
  if (imp) {
    headers.set(IMPERSONATE_HEADER, imp.token);
    headers.delete('Authorization');
    const res = await fetch(input, { ...init, headers, cache: 'no-store' });
    // Phiên đã kết thúc (thoát ở CRM / tab khác): bỏ phiên giả lập trên máy
    if (res.status === 401) {
      const body = await res.clone().json().catch(() => ({}));
      if (body?.impersonationEnded) setImpersonation(null);
    }
    return res;
  }
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
    let real: Session | null = null;
    const apply = () => {
      const imp = getImpersonation();
      const s = imp ? impersonatedSession(imp) : real;
      setState(prev => (s ? (prev.status === 'signed-in' && prev.session.user.id === s.user.id && prev.session.access_token === s.access_token ? prev : { status: 'signed-in', session: s }) : { status: 'signed-out', session: null }));
    };
    c.auth.getSession().then(({ data }) => {
      real = data.session;
      apply();
    });
    const { data: sub } = c.auth.onAuthStateChange((_event, s) => {
      real = s;
      apply();
    });
    // Bắt đầu / kết thúc giả lập (cả ở tab khác)
    const onStorage = (e: StorageEvent) => (e.key === IMP_KEY || e.key === null) && apply();
    window.addEventListener(IMP_EVENT, apply);
    window.addEventListener('storage', onStorage);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener(IMP_EVENT, apply);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return state;
}

const STORAGE_KEY = 'dvvn-actor-auth';

/** Đăng xuất: chờ máy chủ tối đa 2 giây (mạng chậm không làm nút "đứng"), rồi xoá phiên trên máy. */
export async function signOutActor() {
  // Đang giả lập: chỉ bỏ phiên giả lập trên máy (không đụng tài khoản thật)
  if (getImpersonation()) return setImpersonation(null);
  const c = actorClient();
  if (!c) return;
  await Promise.race([c.auth.signOut().catch(() => undefined), new Promise(resolve => setTimeout(resolve, 2000))]);
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* bỏ qua */
  }
}

/** Đăng xuất rồi tải lại hẳn trang đích, để mọi dữ liệu của tài khoản cũ trên trang biến mất ngay (không cần F5). */
export async function signOutAndGo(path: string) {
  // Đang giả lập: nút Đăng xuất mở hộp "Thoát giả lập" (tóm tắt thao tác thật cần xoá)
  if (getImpersonation()) {
    window.dispatchEvent(new Event(IMP_EXIT_EVENT));
    return;
  }
  await signOutActor();
  window.location.replace(path);
}
