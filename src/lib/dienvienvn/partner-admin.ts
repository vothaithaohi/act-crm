import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaffRole } from '@/lib/supabase/auth-guard';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';

// Quản lý tài khoản đối tác trong CRM (API /api/admin/partners).
export const PARTNER_MANAGER_ROLES = ['super_admin', 'admin', 'casting'];

export const EMAIL_RESULT_MESSAGE: Record<string, string> = {
  invited: 'Đã gửi email mời tạo mật khẩu.',
  reset: 'Email này đã có tài khoản — đã gửi email đặt mật khẩu.',
  staff: 'Email thuộc nhân sự CRM nên không gửi email đặt mật khẩu. Hãy dùng email khác cho tài khoản đối tác.',
  failed: 'Chưa gửi được email. Kiểm tra cấu hình SMTP trong Supabase rồi bấm "Gửi lại email".'
};

export async function guardPartnerAdmin(req: NextRequest) {
  const staff = await requireStaffRole(req, PARTNER_MANAGER_ROLES);
  if (staff instanceof NextResponse) return { res: staff };
  const { mode, db } = getServiceDb();
  if (mode === 'demo' || !staff) return { res: NextResponse.json({ mode: 'demo' }) };
  if (!db) return { res: NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 }) };
  return { staff, db };
}

