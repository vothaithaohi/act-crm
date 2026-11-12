import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findAuthUserId, guardStaffAdmin, MIN_STAFF_PASSWORD, STAFF_ROLES } from '@/lib/supabase/staff-admin';
import { purgeAuthIfOrphan } from '@/lib/supabase/account-cleanup';

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

// Xoá nhân sự CRM: xoá dòng nhân sự + tài khoản đăng nhập (nếu email không còn gắn với hồ sơ diễn viên / đối tác / ekip),
// để thêm lại nhân sự hoặc đăng ký bằng email này không bị báo trùng.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardStaffAdmin(req);
  if ('res' in g) return g.res;
  const { id } = await params;
  if (!/^[0-9a-z-]{1,64}$/i.test(id)) return NextResponse.json({ error: 'Không tìm thấy nhân sự.' }, { status: 404 });
  const { data: profile } = await g.db.from('profiles').select('id, email').eq('id', id).maybeSingle();
  if (!profile) return NextResponse.json({ ok: true, missing: true });
  if ((profile.email || '').toLowerCase() === g.staff.email.toLowerCase()) {
    return NextResponse.json({ error: 'Không thể xoá tài khoản bạn đang đăng nhập.' }, { status: 400 });
  }
  const { error } = await g.db.from('profiles').delete().eq('id', id);
  if (error) {
    console.error('[crm] Xoá nhân sự lỗi:', error.message);
    return NextResponse.json({ error: `Không xoá được nhân sự: ${error.message}` }, { status: 500 });
  }
  const accountRemoved = await purgeAuthIfOrphan(g.db, { userId: profile.id, email: profile.email }).catch(() => false);
  return NextResponse.json({ ok: true, accountRemoved });
}
