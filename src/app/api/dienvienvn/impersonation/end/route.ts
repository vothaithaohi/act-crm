import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { findImpersonation, impersonationItems } from '@/lib/dienvienvn/impersonation';

// Kết thúc phiên giả lập từ tab dienvienvn.com; trả danh sách thao tác thật để nhắc xoá.
export async function POST(req: NextRequest) {
  const { db } = getServiceDb();
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });
  const s = await findImpersonation(db, req).catch(() => null);
  if (!s || s === 'ended') return NextResponse.json({ ended: true, items: [] });
  const ended_at = new Date().toISOString();
  await db.from('impersonation_sessions').update({ ended_at }).eq('id', s.id).is('ended_at', null);
  const items = await impersonationItems(db, { ...s, ended_at }).catch(() => []);
  return NextResponse.json({ ended: true, items });
}
