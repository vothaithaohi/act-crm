import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaffRole } from '@/lib/supabase/auth-guard';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';

// Quản lý tài khoản đối tác trong CRM (API /api/admin/partners).
export const PARTNER_MANAGER_ROLES = ['super_admin', 'admin', 'casting'];

export const EMAIL_RESULT_MESSAGE: Record<string, string> = {
  invited: 'Đã gửi email mời tạo mật khẩu.',
  reset: 'Đã gửi email cấp lại mật khẩu — đối tác bấm link trong email để tạo mật khẩu mới.',
  ready: 'Đối tác đã đặt mật khẩu khi đăng ký — đăng nhập được ngay, không cần email.',
  staff: 'Email thuộc nhân sự CRM nên không gửi email đặt mật khẩu. Hãy dùng email khác cho tài khoản đối tác.',
  failed: 'Chưa gửi được email. Kiểm tra cấu hình SMTP trong Supabase rồi bấm "Gửi lại email".',
  approved: 'Đã duyệt và gửi email "Tài khoản đối tác đã được duyệt".',
  approved_no_email: 'Đã duyệt — đối tác đăng nhập được ngay, nhưng chưa gửi được email báo duyệt (kiểm tra cấu hình SMTP_* trên Vercel).'
};

export async function guardPartnerAdmin(req: NextRequest) {
  const staff = await requireStaffRole(req, PARTNER_MANAGER_ROLES);
  if (staff instanceof NextResponse) return { res: staff };
  const { mode, db } = getServiceDb();
  if (mode === 'demo' || !staff) return { res: NextResponse.json({ mode: 'demo' }) };
  if (!db) return { res: NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 }) };
  return { staff, db };
}


/** Chỉ giữ các mã dự án có thật (bỏ trùng, tối đa 100). */
export async function cleanProjectIds(db: SupabaseClient, ids: string[]): Promise<string[]> {
  const unique = Array.from(new Set(ids.filter(id => /^[0-9a-f-]{36}$/i.test(id)))).slice(0, 100);
  if (!unique.length) return [];
  const { data } = await db.from('casting_projects').select('id').in('id', unique);
  const existing = new Set((data || []).map(r => r.id as string));
  return unique.filter(id => existing.has(id));
}
