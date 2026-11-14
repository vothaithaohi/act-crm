import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { findImpersonation, impersonationItems, purgeImpersonationItems } from '@/lib/dienvienvn/impersonation';

// Kết thúc phiên giả lập từ tab dienvienvn.com; trả danh sách thao tác thật để nhắc xoá ({ purge: true } → xoá luôn).
export async function POST(req: NextRequest) {
  const { db } = getServiceDb();
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });
  const s = await findImpersonation(db, req).catch(() => null);
  if (!s || s === 'ended') return NextResponse.json({ ended: true, items: [] });
  const ended_at = new Date().toISOString();
  const body = (await req.json().catch(() => null)) as { purge?: boolean } | null;
  // Xoá toàn bộ thao tác thật của phiên trước khi kết thúc
  const purged = body?.purge ? await purgeImpersonationItems(db, { ...s, ended_at }) : null;
  await db.from('impersonation_sessions').update({ ended_at }).eq('id', s.id).is('ended_at', null);
  const items = purged ? [] : await impersonationItems(db, { ...s, ended_at }).catch(() => []);
  return NextResponse.json({ ended: true, items, ...(purged || {}) });
}
