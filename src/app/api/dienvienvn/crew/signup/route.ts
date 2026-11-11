import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { clientIp, isRateLimited } from '@/lib/dienvienvn/rate-limit';
import { inviteCrewAccount } from '@/lib/dienvienvn/crew-server';

const schema = z.object({
  full_name: z.string().trim().min(2, 'Vui lòng nhập họ tên.').max(120),
  email: z.string().trim().toLowerCase().email('Email chưa đúng định dạng.').max(200)
});

// Đăng ký tài khoản ứng viên ekip: gửi email xác nhận & tạo mật khẩu. Tạo mật khẩu xong là ứng tuyển được.
export async function POST(req: NextRequest) {
  if (isRateLimited(`crew-signup:${clientIp(req.headers)}`, 6, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau 1 giờ.' }, { status: 429 });
  }
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo', ok: true });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const body = (await req.json().catch(() => null)) as { website?: string } | null;
  if (body?.website) return NextResponse.json({ ok: true });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Thông tin chưa hợp lệ.' }, { status: 400 });

  const result = await inviteCrewAccount(db, parsed.data, req.headers);
  if (result === 'staff') return NextResponse.json({ error: 'Email này thuộc nhân sự DienVienVN. Vui lòng dùng email khác.' }, { status: 400 });
  if (result === 'exists') {
    return NextResponse.json({ error: 'Email này đã có tài khoản DienVienVN. Vui lòng đăng nhập để dùng tài khoản ekip.', exists: true }, { status: 409 });
  }
  if (result === 'failed') return NextResponse.json({ error: 'Không gửi được email xác nhận. Vui lòng thử lại sau ít phút.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
