import 'server-only';
import type { SupabaseClient, User } from '@supabase/supabase-js';

// Dọn tài khoản đăng nhập (Supabase Auth) bị bỏ lại sau khi xoá hồ sơ trong CRM:
// xoá hồ sơ diễn viên / đối tác / ekip / nhân sự mà tài khoản đăng nhập vẫn còn → nhập lại email bị báo "đã có tài khoản".

const likeExact = (s: string) => s.trim().toLowerCase().replace(/[\\%_]/g, m => `\\${m}`);

/** Tìm tài khoản đăng nhập theo email. */
export async function findAuthUser(db: SupabaseClient, email: string): Promise<User | null> {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const found = data.users.find(u => (u.email || '').toLowerCase() === clean);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

/** Bảng chưa có (chưa chạy migration) → coi như không có dòng nào. */
async function has(q: PromiseLike<{ data: unknown[] | null; error: unknown }>): Promise<boolean> {
  try {
    const { data } = await q;
    return !!data?.length;
  } catch {
    return false;
  }
}

/** Tài khoản còn gắn với hồ sơ nào không (diễn viên, đối tác, ekip, nhân sự CRM) — theo mã tài khoản hoặc email. */
export async function authUserInUse(db: SupabaseClient, user: Pick<User, 'id' | 'email'>): Promise<boolean> {
  const email = likeExact(user.email || '');
  const checks: PromiseLike<{ data: unknown[] | null; error: unknown }>[] = [
    db.from('talent_profiles').select('id').eq('auth_user_id', user.id).limit(1),
    db.from('partner_accounts').select('id').eq('auth_user_id', user.id).limit(1),
    db.from('crew_profiles').select('id').eq('auth_user_id', user.id).limit(1),
    db.from('profiles').select('id').eq('id', user.id).limit(1)
  ];
  if (email) {
    checks.push(
      db.from('talent_profiles').select('id').ilike('email', email).limit(1),
      db.from('partner_accounts').select('id').ilike('email', email).limit(1),
      db.from('crew_profiles').select('id').ilike('public_email', email).limit(1),
      db.from('profiles').select('id').ilike('email', email).limit(1)
    );
  }
  const results = await Promise.all(checks.map(has));
  return results.some(Boolean);
}

/** Xoá tài khoản đăng nhập nếu không còn gắn với hồ sơ nào. Trả true nếu đã xoá. */
export async function purgeAuthIfOrphan(db: SupabaseClient, ref: { userId?: string | null; email?: string | null }): Promise<boolean> {
  let user: User | null = null;
  if (ref.userId) {
    const { data } = await db.auth.admin.getUserById(ref.userId);
    user = data?.user || null;
  }
  if (!user && ref.email) user = await findAuthUser(db, ref.email);
  if (!user) return false;
  if (await authUserInUse(db, user)) return false;
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) console.error('[crm] Không xoá được tài khoản đăng nhập bị bỏ lại:', error.message);
  return !error;
}
