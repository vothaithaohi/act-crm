import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { TalentProfile } from '@/lib/types/crm';
import { publicSiteUrl } from './hosts';

/** Trang đặt mật khẩu mà email mời / quên mật khẩu trỏ tới. */
export const SET_PASSWORD_PATH = '/tao-mat-khau';

export type ActorContext = { user: User; talent: TalentProfile | null };

/**
 * Xác minh diễn viên qua header "Authorization: Bearer <access token>" và tìm hồ sơ gắn với tài khoản.
 * Trả NextResponse lỗi nếu chưa đăng nhập / phiên hết hạn.
 */
export async function getActor(req: NextRequest, db: SupabaseClient): Promise<ActorContext | NextResponse> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Vui lòng đăng nhập.', authRequired: true }, { status: 401 });

  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) {
    return NextResponse.json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', authRequired: true }, { status: 401 });
  }

  const { data: rows } = await db
    .from('talent_profiles')
    .select('*')
    .eq('auth_user_id', data.user.id)
    .order('created_at', { ascending: false })
    .limit(1);
  return { user: data.user, talent: (rows?.[0] as TalentProfile) || null };
}

/** Tìm hồ sơ theo email (không phân biệt hoa thường, so khớp chính xác). */
export async function findTalentByEmail(db: SupabaseClient, email: string): Promise<TalentProfile | null> {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  const { data } = await db
    .from('talent_profiles')
    .select('*')
    .ilike('email', clean.replace(/[\\%_]/g, m => `\\${m}`))
    .order('created_at', { ascending: false })
    .limit(5);
  return ((data as TalentProfile[]) || []).find(t => (t.email || '').trim().toLowerCase() === clean) || null;
}

export type AccountEmailResult = 'invited' | 'reset' | 'exists' | 'failed';

/**
 * Gửi email tài khoản cho chủ hồ sơ:
 * - chưa có tài khoản / chưa từng kích hoạt → email mời xác nhận & tạo mật khẩu;
 * - đã kích hoạt → email đặt lại mật khẩu.
 * Email do Supabase Auth gửi (cần cấu hình SMTP riêng trong Supabase).
 */
export async function sendAccountEmail(db: SupabaseClient, talent: TalentProfile, headers: Headers): Promise<AccountEmailResult> {
  const email = (talent.email || '').trim().toLowerCase();
  if (!email) return 'failed';
  const redirectTo = `${publicSiteUrl(headers)}${SET_PASSWORD_PATH}`;

  if (talent.auth_user_id) {
    const { data } = await db.auth.admin.getUserById(talent.auth_user_id);
    const user = data?.user;
    if (user && (user.last_sign_in_at || user.email_confirmed_at)) {
      const { error } = await db.auth.resetPasswordForEmail(user.email || email, { redirectTo });
      if (error) console.error('[dienvienvn] Không gửi được email đặt lại mật khẩu:', error.message);
      return error ? 'failed' : 'reset';
    }
  }

  const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { kind: 'dienvienvn_actor', full_name: talent.full_name }
  });
  if (error) {
    // Email đã có tài khoản Supabase (VD: tài khoản nhân sự) → không tự gắn để tránh nhầm quyền.
    if (/already|registered|exists/i.test(error.message)) return 'exists';
    console.error('[dienvienvn] Không gửi được email mời tạo tài khoản:', error.message);
    return 'failed';
  }

  if (data?.user?.id && data.user.id !== talent.auth_user_id) {
    const { error: linkError } = await db.from('talent_profiles').update({ auth_user_id: data.user.id }).eq('id', talent.id);
    if (linkError) {
      console.error('[dienvienvn] Không gắn được tài khoản vào hồ sơ — hãy chạy migration 20261015_actor_accounts.sql:', linkError.message);
      return 'failed';
    }
  }
  return 'invited';
}

/** Cột mà PostgREST báo không tồn tại (PGRST204: "Could not find the 'x' column of 'y' in the schema cache"). */
export function missingColumn(error: { code?: string; message?: string } | null): string | null {
  if (!error?.message) return null;
  if (error.code !== 'PGRST204' && error.code !== '42703' && !/column/i.test(error.message)) return null;
  return error.message.match(/'([a-z_]+)' column/i)?.[1] ?? error.message.match(/column "?([a-z_]+)"? of relation/i)?.[1] ?? null;
}

/** Ghi talent_profiles; nếu database thiếu cột (chưa chạy đủ migration) thì bỏ cột đó và thử lại. */
export async function writeTalent(
  run: (row: Record<string, unknown>) => PromiseLike<{ error: { code?: string; message?: string } | null }>,
  record: Record<string, unknown>
) {
  const row: Record<string, unknown> = { ...record };
  let { error } = await run(row);
  for (let attempt = 0; error && attempt < 8; attempt++) {
    const col = missingColumn(error);
    if (!col || !(col in row) || col === 'id') break;
    console.error(`[dienvienvn] Bảng talent_profiles thiếu cột "${col}" — hãy chạy các migration mới nhất.`);
    delete row[col];
    ({ error } = await run(row));
  }
  return { error };
}
