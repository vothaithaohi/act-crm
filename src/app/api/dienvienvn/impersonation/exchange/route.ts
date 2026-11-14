import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { KIND_HOME, exchangeImpersonationCode } from '@/lib/dienvienvn/impersonation';

// Tab dienvienvn.com đổi mã dùng 1 lần (từ CRM, 2 phút) lấy mã phiên giả lập.
export async function POST(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ error: 'Chế độ demo không giả lập được.' }, { status: 400 });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });
  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  const res = await exchangeImpersonationCode(db, String(body?.code || '')).catch(() => null);
  if (!res) return NextResponse.json({ error: 'Link giả lập đã hết hạn hoặc đã dùng. Bấm “Giả lập tài khoản” trong CRM để mở lại.' }, { status: 400 });
  const { data } = await db.auth.admin.getUserById(res.session.target_user_id);
  if (!data?.user) return NextResponse.json({ error: 'Tài khoản không còn tồn tại.' }, { status: 404 });
  const s = res.session;
  return NextResponse.json(
    {
      token: res.token,
      session_id: s.id,
      kind: s.target_kind,
      label: s.target_label || data.user.email || '',
      user_id: s.target_user_id,
      email: data.user.email || '',
      admin_email: s.admin_email,
      started_at: s.created_at,
      next: KIND_HOME[s.target_kind]
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
