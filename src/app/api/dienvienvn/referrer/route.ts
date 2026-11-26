import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb } from '@/lib/projects/server';
import { REF_COOKIE, decodeRef } from '@/lib/dienvienvn/referral';

/** Tên người giới thiệu theo mã đã nhớ trên máy (để form nộp hồ sơ tự điền ô "Ai giới thiệu bạn"). */
export async function GET(req: NextRequest) {
  const ref = decodeRef(req.cookies.get(REF_COOKIE)?.value);
  if (!ref) return NextResponse.json({ code: null, name: null }, { headers: { 'Cache-Control': 'no-store' } });
  const { db } = getServiceDb();
  let name: string | null = null;
  if (db) {
    const { data } = await db.from('referrers').select('name').eq('code', ref.code).maybeSingle();
    name = (data?.name as string) || null;
  }
  return NextResponse.json({ code: ref.code, name }, { headers: { 'Cache-Control': 'no-store' } });
}
