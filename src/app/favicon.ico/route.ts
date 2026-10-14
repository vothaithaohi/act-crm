import { NextRequest, NextResponse } from 'next/server';
import { isPublicHost } from '@/lib/dienvienvn/hosts';

// /favicon.ico của dienvienvn.com (Google dùng file này cho kết quả tìm kiếm). CRM giữ nguyên không có icon.
export function GET(req: NextRequest) {
  if (!isPublicHost(req.headers)) return new Response(null, { status: 404 });
  return NextResponse.redirect(new URL('/dvvn-favicon.ico', req.url), 308);
}
