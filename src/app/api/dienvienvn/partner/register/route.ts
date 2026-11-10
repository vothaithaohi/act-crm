import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { isStaffEmail } from '@/lib/dienvienvn/actor-server';
import { sendPartnerEmail } from '@/lib/dienvienvn/partner-server';
import type { PartnerAccount } from '@/lib/dienvienvn/partners';
import { clientIp, isRateLimited } from '@/lib/dienvienvn/rate-limit';

// Đối tác tự đăng ký: điền thông tin + email → nhận ngay email xác thực, bấm link để tạo mật khẩu.
// Tài khoản ở trạng thái "Chờ duyệt": DienVienVN duyệt trong CRM thì mới vào được cổng đối tác.
const schema = z.object({
  full_name: z.string().trim().min(2, 'Vui lòng nhập họ tên').max(120),
  email: z.string().trim().toLowerCase().email('Email chưa đúng định dạng').max(160),
  phone: z
    .string()
    .trim()
    .max(20)
    .refine(v => v.replace(/\D/g, '').length >= 9, 'Số điện thoại chưa đúng'),
  company: z.string().trim().max(160).optional().default(''),
  partner_type: z.enum(['director', 'producer', 'casting', 'agency', 'brand', 'other']).default('producer'),
  note: z.string().trim().max(1000).optional().default(''),
  // Ô ẩn chống bot: người thật không bao giờ điền
  website: z.string().optional()
});

const OK = {
  ok: true,
  message: 'Đã nhận đăng ký. Mở email xác nhận để tạo mật khẩu; bạn dùng được cổng đối tác sau khi DienVienVN duyệt tài khoản.'
};

export async function POST(req: NextRequest) {
  if (isRateLimited(`partner-register:${clientIp(req.headers)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau 1 giờ.' }, { status: 429 });
  }
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo', ...OK });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const msg = issue?.message && !/^(Expected|Invalid|String must)/.test(issue.message) ? issue.message : 'Thông tin đăng ký chưa hợp lệ.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const input = parsed.data;
  if (input.website) return NextResponse.json(OK);

  if (await isStaffEmail(db, input.email)) {
    return NextResponse.json({ error: 'Email này thuộc nhân sự DienVienVN. Vui lòng dùng email khác.' }, { status: 400 });
  }

  // Email đã đăng ký đối tác → trả cùng thông báo, KHÔNG tạo tài khoản đăng nhập (không lộ, không chiếm email)
  const { data: dup } = await db.from('partner_accounts').select('id').ilike('email', input.email.replace(/[\\%_]/g, m => `\\${m}`)).limit(1);
  if (dup?.length) return NextResponse.json(OK);

  const { data: created, error } = await db.from('partner_accounts').insert({
    email: input.email,
    full_name: input.full_name,
    phone: input.phone,
    company: input.company || null,
    partner_type: input.partner_type,
    note: input.note || null,
    status: 'pending',
    auth_user_id: null,
    project_ids: [],
    created_by: 'Tự đăng ký'
  }).select('*').single();
  if (error || !created) {
    // Email đã có tài khoản / đã đăng ký: trả cùng thông báo để không lộ email nào đã là đối tác
    if (error?.code === '23505') return NextResponse.json(OK);
    const missing = /phone|status_check|pending/.test(error?.message || '');
    console.error('[dienvienvn] Đăng ký đối tác lỗi:', error?.message);
    return NextResponse.json(
      { error: missing ? 'Hệ thống chưa sẵn sàng nhận đăng ký (cần chạy migration 20261107_partner_signup.sql).' : 'Không gửi được đăng ký. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
  // Gửi ngay email xác thực + tạo mật khẩu (mẫu "Hồ sơ đối tác của bạn đã được gửi")
  const result = await sendPartnerEmail(db, created as PartnerAccount, req.headers);
  if (result === 'failed') console.error('[dienvienvn] Đăng ký đối tác: chưa gửi được email xác thực cho', input.email);
  return NextResponse.json(OK);
}
