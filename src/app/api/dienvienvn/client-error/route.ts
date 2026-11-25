import { NextRequest, NextResponse } from 'next/server';
import { clientIp, isRateLimited } from '@/lib/dienvienvn/rate-limit';

// Lỗi xảy ra trên trình duyệt người dùng (trang trắng "Application error"): ghi vào log Vercel để tìm nguyên nhân.
export async function POST(req: NextRequest) {
  if (isRateLimited(`client-error:${clientIp(req.headers)}`, 20, 10 * 60 * 1000)) return NextResponse.json({ ok: true });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const clip = (v: unknown, n: number) => String(v ?? '').slice(0, n);
  console.error('[dienvienvn] Lỗi trên trình duyệt:', {
    message: clip(b?.message, 500),
    stack: clip(b?.stack, 1500),
    digest: clip(b?.digest, 100),
    url: clip(b?.url, 300),
    ua: clip(req.headers.get('user-agent'), 300)
  });
  return NextResponse.json({ ok: true });
}
