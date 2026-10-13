import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findTalentByEmail, sendAccountEmail } from '@/lib/dienvienvn/actor-server';
import { clientIp, isRateLimited } from '@/lib/dienvienvn/rate-limit';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';

const schema = z.object({ email: z.string().trim().email().max(160) });

// Gửi lại email kích hoạt tài khoản / đặt lại mật khẩu. Luôn trả cùng một thông báo
// để không lộ email nào đã có hồ sơ.
export async function POST(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ error: 'Chế độ demo chưa hỗ trợ tài khoản diễn viên.' }, { status: 400 });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Email không hợp lệ.' }, { status: 400 });
  const email = parsed.data.email.toLowerCase();

  if (isRateLimited(`account-email:${clientIp(req.headers)}`, 5, 15 * 60 * 1000) || isRateLimited(`account-email:${email}`, 3, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau 15 phút.' }, { status: 429 });
  }

  const talent = await findTalentByEmail(db, email);
  if (talent) await sendAccountEmail(db, talent, req.headers);
  return NextResponse.json({ ok: true });
}
