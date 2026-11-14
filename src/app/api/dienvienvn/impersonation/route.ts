import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { findImpersonation, impersonationItems } from '@/lib/dienvienvn/impersonation';

// Phiên giả lập hiện tại + những thao tác thật đã làm (hiện trong hộp "Thoát giả lập").
export async function GET(req: NextRequest) {
  const { db } = getServiceDb();
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });
  const s = await findImpersonation(db, req).catch(() => null);
  if (!s || s === 'ended') return NextResponse.json({ error: 'Phiên giả lập đã kết thúc.', impersonationEnded: true }, { status: 401 });
  const items = await impersonationItems(db, s).catch(() => []);
  return NextResponse.json({ session: s, items }, { headers: { 'Cache-Control': 'no-store' } });
}
