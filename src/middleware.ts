import { NextRequest, NextResponse } from 'next/server';
import { CRM_HOST, PUBLIC_HOSTS, RECAP_HOSTS, SITE_URL } from '@/lib/dienvienvn/hosts';
import { LANG_COOKIE, LANG_HEADER } from '@/lib/dienvienvn/i18n/core';
import { REF_COOKIE, REF_MAX_AGE, UTM_COOKIE, encodeRef, encodeUtm, readTouch } from '@/lib/dienvienvn/referral';

// Trên tên miền DienVienVN, toàn bộ đường dẫn được phục vụ từ /dienvienvn và CRM không bị lộ ra ngoài.

export function middleware(req: NextRequest) {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(':')[0].toLowerCase();
  // recap.dienvienvn.com: chỉ phục vụ các trang Recap cuộc họp
  if (RECAP_HOSTS.includes(host)) {
    const p = req.nextUrl.pathname;
    if (p === '/recap' || p.startsWith('/recap/')) return NextResponse.redirect(new URL(p.slice(6) || '/', req.url), 308);
    const url = req.nextUrl.clone();
    url.pathname = `/recap${p === '/' ? '' : p}`;
    return NextResponse.rewrite(url);
  }
  if (!PUBLIC_HOSTS.includes(host)) {
    // Ngoài tên miền chính (CRM, bản xem trước): /dienvienvn/en/... = bản tiếng Anh
    const p = req.nextUrl.pathname;
    if (p === '/dienvienvn/en' || p.startsWith('/dienvienvn/en/')) {
      const url = req.nextUrl.clone();
      url.pathname = `/dienvienvn${p.slice('/dienvienvn/en'.length)}`;
      return rewriteWithLang(req, url, '/dienvienvn/en', 'en');
    }
    // /dienvienvn/... (không có /en) luôn là tiếng Việt, không theo ngôn ngữ đã nhớ
    if (p === '/dienvienvn' || p.startsWith('/dienvienvn/')) {
      const headers = new Headers(req.headers);
      headers.set(LANG_HEADER, 'vi');
      return rememberReferral(req, NextResponse.next({ request: { headers } }));
    }
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // dienvienvn.com/admin → CRM ở tên miền riêng (CRM dùng đường dẫn gốc nên không chạy dưới /admin được)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return NextResponse.redirect(`https://${CRM_HOST}/`, 308);
  }

  if (pathname === '/dienvienvn' || pathname.startsWith('/dienvienvn/')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice('/dienvienvn'.length) || '/';
    return NextResponse.redirect(url, 308);
  }

  // Bản tiếng Anh: dienvienvn.com/en/... (cùng trang, chữ tiếng Anh)
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const rest = pathname.slice(3);
    const url = req.nextUrl.clone();
    url.pathname = `/dienvienvn${rest === '/' ? '' : rest}`;
    return rewriteWithLang(req, url, '/en', 'en', rest || '/');
  }

  const url = req.nextUrl.clone();
  url.pathname = `/dienvienvn${pathname === '/' ? '' : pathname}`;
  return rewriteWithLang(req, url, '', 'vi', pathname);
}

/** Phục vụ trang DienVienVN với đường dẫn gốc + ngôn ngữ; nhớ ngôn ngữ (cookie) để API / email dùng đúng ngôn ngữ. */
function rewriteWithLang(req: NextRequest, url: URL, base: string, lang: 'vi' | 'en', publicPath?: string) {
  const headers = new Headers(req.headers);
  headers.set('x-dienvienvn-base', base);
  headers.set(LANG_HEADER, lang);
  const res = NextResponse.rewrite(url, { request: { headers } });
  if (req.cookies.get(LANG_COOKIE)?.value !== lang) res.cookies.set(LANG_COOKIE, lang, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  // Báo Google trang này có 2 ngôn ngữ (hreflang)
  if (publicPath !== undefined) {
    const p = publicPath === '/' ? '' : publicPath;
    res.headers.set('Link', `<${SITE_URL}${p || '/'}>; rel="alternate"; hreflang="vi", <${SITE_URL}/en${p}>; rel="alternate"; hreflang="en", <${SITE_URL}${p || '/'}>; rel="alternate"; hreflang="x-default"`);
  }
  return rememberReferral(req, res);
}

/** ?ref= / ?utm_*: nhớ 30 ngày. Đã có thì giữ nguyên (tính cho người giới thiệu đầu tiên). */
function rememberReferral(req: NextRequest, res: NextResponse) {
  const { ref, utm } = readTouch(req.nextUrl.searchParams);
  const at = new Date().toISOString();
  const opts = { path: '/', maxAge: REF_MAX_AGE, sameSite: 'lax' as const, httpOnly: true, secure: req.nextUrl.protocol === 'https:' };
  if (ref && !req.cookies.get(REF_COOKIE)) res.cookies.set(REF_COOKIE, encodeRef({ code: ref, at }), opts);
  if (utm && !req.cookies.get(UTM_COOKIE)) res.cookies.set(UTM_COOKIE, encodeUtm({ ...utm, at }), opts);
  return res;
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)']
};
