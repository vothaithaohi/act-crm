'use client';

import { useEffect } from 'react';

// Lỗi ngoài cùng (thay cho trang trắng "Application error"): ghi lỗi, trang cũ sau khi cập nhật web thì tự tải lại 1 lần.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    try {
      const body = JSON.stringify({ message: error.message, stack: error.stack, digest: error.digest, url: window.location.href });
      navigator.sendBeacon?.('/api/dienvienvn/client-error', new Blob([body], { type: 'application/json' }));
      if (/ChunkLoadError|Loading chunk|dynamically imported module/i.test(error.message)) {
        const last = Number(sessionStorage.getItem('dvvn-stale-reload') || 0);
        if (Date.now() - last > 60_000) {
          sessionStorage.setItem('dvvn-stale-reload', String(Date.now()));
          window.location.reload();
        }
      }
    } catch {
      /* bỏ qua */
    }
  }, [error]);
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: '-apple-system, Helvetica, Arial, sans-serif', background: '#f5f5f7' }}>
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 26, margin: 0, color: '#1d1d1f' }}>Trang chưa tải được.</h1>
          <p style={{ maxWidth: 420, color: '#6e6e73', fontSize: 16, lineHeight: 1.5 }}>Có thể web vừa được cập nhật. Bấm tải lại để mở bản mới nhất. Nếu đang bật dịch trang tự động, hãy tắt dịch rồi thử lại.</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 12, height: 44, padding: '0 24px', borderRadius: 999, border: 0, background: '#1d1d1f', color: '#fff', fontSize: 15, fontWeight: 600 }}>
            Tải lại trang
          </button>
        </main>
      </body>
    </html>
  );
}
