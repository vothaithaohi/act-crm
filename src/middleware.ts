import { NextRequest, NextResponse } from 'next/server';
import { PUBLIC_HOSTS } from '@/lib/dienvienvn/hosts';

// Trên tên miền DienVienVN, toàn bộ đường dẫn được phục vụ từ /dienvienvn và CRM không bị lộ ra ngoài.

export function middleware(req: NextRequest) {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(':')[0].toLowerCase();
  if (!PUBLIC_HOSTS.includes(host)) return NextResponse.next();

  const { pathname } = req.nextUrl;

  if (pathname === '/dienvienvn' || pathname.startsWith('/dienvienvn/')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice('/dienvienvn'.length) || '/';
    return NextResponse.redirect(url, 308);
  }

  const url = req.nextUrl.clone();
  url.pathname = `/dienvienvn${pathname === '/' ? '' : pathname}`;
  const headers = new Headers(req.headers);
  headers.set('x-dienvienvn-base', '');
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)']
};
