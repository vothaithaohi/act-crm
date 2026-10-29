import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findAuthUserId, guardStaffAdmin, MIN_STAFF_PASSWORD, STAFF_ROLES } from '@/lib/supabase/staff-admin';

const schema = z.object({
  full_name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  department: z.string().trim().max(120).optional(),
  role: z.enum(STAFF_ROLES).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  /** Đặt mật khẩu mới (để trống = giữ nguyên) */
  password: z.string().max(72).optional()
});

// Sửa nhân sự CRM; đổi mật khẩu đăng nhập nếu có nhập mật khẩu mới.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardStaffAdmin(req);
  if ('res' in g) return g.res;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Không tìm thấy nhân sự.' }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  const { password, ...fields } = parsed.data;
  if (password && password.length < MIN_STAFF_PASSWORD) {
    return NextResponse.json({ error: `Mật khẩu cần ít nhất ${MIN_STAFF_PASSWORD} ký tự.` }, { status: 400 });
  }

  const changes: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) changes[k] = (k === 'phone' || k === 'department') && !v ? null : v;
  const { data: profile, error } = await g.db.from('profiles').update(changes).eq('id', id).select('*').maybeSingle();
  if (error) return NextResponse.json({ error: 'Không lưu được thay đổi.' }, { status: 500 });
  if (!profile) return NextResponse.json({ error: 'Không tìm thấy nhân sự.' }, { status: 404 });

  if (password) {
    const authId = await findAuthUserId(g.db, profile.email);
    if (!authId) return NextResponse.json({ error: 'Đã lưu thông tin nhưng nhân sự này chưa có tài khoản đăng nhập.' }, { status: 400 });
    const { error: pwError } = await g.db.auth.admin.updateUserById(authId, { password });
    if (pwError) return NextResponse.json({ error: 'Đã lưu thông tin nhưng không đổi được mật khẩu.' }, { status: 500 });
  }
  return NextResponse.json({ profile });
}
