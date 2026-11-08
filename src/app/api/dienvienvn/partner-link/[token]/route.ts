import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { partnerLinkView } from '@/lib/dienvienvn/partner-server';
import { clientIp, isBlocked, recordHit } from '@/lib/dienvienvn/rate-limit';

// Link riêng của NSX: ai có link xem được, không cần đăng nhập, không hết hạn (ngừng khi ACT khoá đối tác).
// Mã sai nhiều lần thì IP bị chặn tạm, để không dò được mã.
const FAIL_LIMIT = 20;
const FAIL_WINDOW_MS = 60 * 60 * 1000;
const NOT_FOUND = 'Link không hợp lệ hoặc đã ngừng hoạt động.';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const token = decodeURIComponent((await params).token).trim().toLowerCase();
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const failKey = `nsx-link-fail:${clientIp(req.headers)}`;
  if (isBlocked(failKey, FAIL_LIMIT, FAIL_WINDOW_MS)) {
    return NextResponse.json({ error: 'Bạn đã mở sai link quá nhiều lần. Vui lòng thử lại sau 1 giờ.' }, { status: 429 });
  }
  if (!/^[0-9a-z]{12,64}$/.test(token)) {
    recordHit(failKey);
    return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  }
  const view = await partnerLinkView(db, token);
  if (!view) {
    recordHit(failKey);
    return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  }
  return NextResponse.json({ mode: 'live', ...view }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
}
