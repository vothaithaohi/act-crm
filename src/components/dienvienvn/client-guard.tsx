'use client';

import { useEffect } from 'react';

/** Gửi lỗi trình duyệt về máy chủ (xem trong log Vercel). */
export function reportClientError(e: { message?: string; stack?: string; digest?: string }) {
  try {
    const body = JSON.stringify({ message: e.message, stack: e.stack, digest: e.digest, url: window.location.href });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/dienvienvn/client-error', new Blob([body], { type: 'application/json' }));
    else void fetch('/api/dienvienvn/client-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
  } catch {
    /* bỏ qua */
  }
}

/** Lỗi do trang đang mở là bản cũ (file JavaScript đã được thay sau khi cập nhật web). */
export const isStaleBuildError = (msg = '') => /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg);

const RELOAD_KEY = 'dvvn-stale-reload';
/** Tải lại trang 1 lần (tránh lặp vô hạn) để lấy bản web mới nhất. */
export function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    /* bỏ qua */
  }
  window.location.reload();
  return true;
}

/**
 * Chạy 1 lần trên mọi trang DienVienVN:
 * - Trang cũ sau khi cập nhật web (không tải được file JS) → tự tải lại trang.
 * - Chrome / Google Dịch tự dịch trang làm React lỗi khi cập nhật chữ → chặn lỗi removeChild / insertBefore.
 */
export function ClientGuard() {
  useEffect(() => {
    const onError = (e: ErrorEvent | PromiseRejectionEvent) => {
      const msg = 'reason' in e ? String((e.reason as Error)?.message || e.reason) : e.message;
      if (isStaleBuildError(msg)) reloadOnce();
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onError);

    // Cách xử lý phổ biến cho lỗi React + Google Dịch (https://github.com/facebook/react/issues/11538)
    const proto = Node.prototype as Node & { __dvvnPatched?: boolean };
    if (!proto.__dvvnPatched) {
      proto.__dvvnPatched = true;
      const removeChild = proto.removeChild;
      proto.removeChild = function <T extends Node>(this: Node, child: T): T {
        if (child.parentNode !== this) return child;
        return removeChild.call(this, child) as T;
      };
      const insertBefore = proto.insertBefore;
      proto.insertBefore = function <T extends Node>(this: Node, node: T, ref: Node | null): T {
        if (ref && ref.parentNode !== this) return node;
        return insertBefore.call(this, node, ref) as T;
      };
    }
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onError);
    };
  }, []);
  return null;
}
