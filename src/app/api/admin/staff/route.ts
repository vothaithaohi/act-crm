import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findAuthUserId, guardStaffAdmin, MIN_STAFF_PASSWORD, STAFF_ROLES } from '@/lib/supabase/staff-admin';

const schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(MIN_STAFF_PASSWORD).max(72),
  phone: z.string().trim().max(30).optional().default(''),
  department: z.string().trim().max(120).optional().default(''),
  role: z.enum(STAFF_ROLES),
  status: z.enum(['active', 'inactive']).default('active')
});

// Tạo nhân sự CRM: tài khoản đăng nhập (Supabase Auth, đã xác nhận email) + dòng trong bảng profiles.
// Mật khẩu chỉ lưu trong Supabase Auth (đã mã hoá), không lưu vào bảng profiles.
export async function POST(req: NextRequest) {
  const g = await guardStaffAdmin(req);
  if ('res' in g) return g.res;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: `Vui lòng nhập họ tên, email hợp lệ và mật khẩu ít nhất ${MIN_STAFF_PASSWORD} ký tự.` }, { status: 400 });
  }
  const { password, ...input } = parsed.data;

  const { data: existingProfile } = await g.db.from('profiles').select('id').ilike('email', input.email.replace(/[\\%_]/g, m => `\\${m}`)).limit(1);
  if (existingProfile?.length) return NextResponse.json({ error: 'Email này đã có trong danh sách nhân sự.' }, { status: 409 });

  let authId: string | null = null;
  let passwordSet = true;
  const { data: created, error: createError } = await g.db.auth.admin.createUser({
    email: input.email,
    password,
    email_confirm: true,
    user_metadata: { kind: 'crm_staff', full_name: input.full_name }
  });
  if (createError) {
    if (!/already|registered|exists/i.test(createError.message)) {
      console.error('[crm] Không tạo được tài khoản đăng nhập:', createError.message);
      return NextResponse.json({ error: 'Không tạo được tài khoản đăng nhập. Vui lòng thử lại.' }, { status: 500 });
    }
    // Email đã có tài khoản (VD: từng nộp hồ sơ diễn viên): giữ nguyên mật khẩu hiện tại của người đó
    authId = await findAuthUserId(g.db, input.email);
    passwordSet = false;
  } else {
    authId = created.user?.id || null;
  }

  const now = new Date().toISOString();
  const row = {
    ...(authId ? { id: authId } : {}),
    ...input,
    phone: input.phone || null,
    department: input.department || null,
    last_login: now,
    created_at: now,
    updated_at: now
  };
  const { data: profile, error } = await g.db.from('profiles').insert(row).select('*').single();
  if (error) {
    console.error('[crm] Không lưu được hồ sơ nhân sự:', error.message);
    return NextResponse.json({ error: 'Đã tạo tài khoản đăng nhập nhưng không lưu được hồ sơ nhân sự.' }, { status: 500 });
  }
  return NextResponse.json({ profile, passwordSet });
}
