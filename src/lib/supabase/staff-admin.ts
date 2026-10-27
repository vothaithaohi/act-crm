import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireStaffRole } from '@/lib/supabase/auth-guard';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';

// Quản lý tài khoản nhân sự CRM (API /api/admin/staff) — chỉ Ban Giám Đốc.
export const STAFF_ROLES = ['super_admin', 'sales', 'marketing', 'casting', 'developer'] as const;
export const MIN_STAFF_PASSWORD = 8;

export async function guardStaffAdmin(req: NextRequest) {
  const staff = await requireStaffRole(req, ['super_admin', 'admin']);
  if (staff instanceof NextResponse) return { res: staff };
  const { mode, db } = getServiceDb();
  if (mode === 'demo' || !staff) return { res: NextResponse.json({ mode: 'demo' }) };
  if (!db) return { res: NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 }) };
  return { staff, db };
}

/** Tìm tài khoản đăng nhập (Supabase Auth) theo email. */
export async function findAuthUserId(db: SupabaseClient, email: string): Promise<string | null> {
  const clean = email.trim().toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const found = data.users.find(u => (u.email || '').toLowerCase() === clean);
    if (found) return found.id;
    if (data.users.length < 200) return null;
  }
  return null;
}
