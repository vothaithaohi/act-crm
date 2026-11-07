import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { createPasswordAccount, isStaffEmail } from '@/lib/dienvienvn/actor-server';
import { clientIp, isRateLimited } from '@/lib/dienvienvn/rate-limit';

// Đối tác tự đăng ký: tạo tài khoản ở trạng thái "Chờ duyệt". Chưa có mật khẩu, chưa đăng nhập được.
// DienVienVN duyệt trong CRM (Tài khoản đối tác) → hệ thống gửi email để đối tác tự đặt mật khẩu.
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
  // Mật khẩu đặt ngay khi đăng ký: được duyệt là đăng nhập được, không cần mở email
  password: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự').max(72).optional(),
  // Ô ẩn chống bot: người thật không bao giờ điền
  website: z.string().optional()
});

const OK = { ok: true, message: 'Đã nhận đăng ký. DienVienVN sẽ xem xét và kích hoạt tài khoản cho bạn.' };

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

  // Tạo tài khoản bằng mật khẩu vừa đặt; email đã có tài khoản (VD: cũng là diễn viên) thì không đổi mật khẩu —
  // khi được duyệt, hệ thống gửi email để chủ hộp thư tự đặt / dùng mật khẩu hiện có
  let authUserId: string | null = null;
  let existingAccount = false;
  if (input.password) {
    const created = await createPasswordAccount(db, { email: input.email, password: input.password, kind: 'dienvienvn_partner', full_name: input.full_name });
    if ('user' in created) authUserId = created.user.id;
    else if ('exists' in created) existingAccount = true;
  }

  const { error } = await db.from('partner_accounts').insert({
    email: input.email,
    full_name: input.full_name,
    phone: input.phone,
    company: input.company || null,
    partner_type: input.partner_type,
    note: input.note || null,
    status: 'pending',
    auth_user_id: authUserId,
    project_ids: [],
    created_by: 'Tự đăng ký'
  });
  if (error) {
    // Không lưu được đăng ký → xoá tài khoản vừa tạo để không còn tài khoản mồ côi
    if (authUserId) await db.auth.admin.deleteUser(authUserId);
    // Email đã có tài khoản / đã đăng ký: trả cùng thông báo để không lộ email nào đã là đối tác
    if (error.code === '23505') return NextResponse.json(OK);
    const missing = /phone|status_check|pending/.test(error.message);
    console.error('[dienvienvn] Đăng ký đối tác lỗi:', error.message);
    return NextResponse.json(
      { error: missing ? 'Hệ thống chưa sẵn sàng nhận đăng ký (cần chạy migration 20261107_partner_signup.sql).' : 'Không gửi được đăng ký. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
  return NextResponse.json({
    ...OK,
    passwordSet: !!authUserId,
    message: authUserId
      ? 'Đã nhận đăng ký. Khi DienVienVN duyệt, bạn đăng nhập ngay bằng email và mật khẩu vừa tạo.'
      : existingAccount
        ? 'Đã nhận đăng ký. Email này đã có tài khoản DienVienVN — khi được duyệt, bạn đăng nhập bằng mật khẩu hiện có (hoặc dùng “Quên mật khẩu”).'
        : OK.message
  });
}
