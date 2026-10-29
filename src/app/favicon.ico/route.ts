import { NextRequest, NextResponse } from 'next/server';
import { isPublicHost } from '@/lib/dienvienvn/hosts';

// /favicon.ico: dienvienvn.com dùng icon DienVienVN (Google dùng file này cho kết quả tìm kiếm),
// CRM (admin.dienvienvn.com) dùng logo ACT nền đen.
export function GET(req: NextRequest) {
  const file = isPublicHost(req.headers) ? '/dvvn-favicon.ico' : '/act-favicon.ico';
  return NextResponse.redirect(new URL(file, req.url), 308);
}
