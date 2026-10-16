import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { toProducerTalent } from '@/lib/projects/producer';
import { TalentProfile } from '@/lib/types/crm';
import { findAuthUserByEmail, isStaffEmail, SET_PASSWORD_PATH } from './actor-server';
import { publicSiteUrl } from './hosts';
import { PartnerAccount, PartnerTalent } from './partners';

/** Bỏ ký tự đặc biệt của LIKE để so khớp email chính xác (không phân biệt hoa thường). */
const likeExact = (s: string) => s.replace(/[\\%_]/g, m => `\\${m}`);

/**
 * Xác minh đối tác qua header "Authorization: Bearer <access token>" (cùng phiên đăng nhập DienVienVN).
 * Trả NextResponse lỗi nếu chưa đăng nhập, không phải đối tác, hoặc tài khoản đã bị khoá.
 */
export async function getPartner(req: NextRequest, db: SupabaseClient): Promise<PartnerAccount | NextResponse> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Vui lòng đăng nhập.', authRequired: true }, { status: 401 });

  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) {
    return NextResponse.json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', authRequired: true }, { status: 401 });
  }
  const partner = await findPartnerForUser(db, data.user);
  if (!partner) {
    return NextResponse.json({ error: 'Tài khoản này chưa được cấp quyền đối tác.', notPartner: true }, { status: 403 });
  }
  if (partner.status !== 'active') {
    return NextResponse.json({ error: 'Tài khoản đối tác đã bị tạm khoá. Vui lòng liên hệ DienVienVN.', notPartner: true }, { status: 403 });
  }
  void db.from('partner_accounts').update({ last_seen_at: new Date().toISOString() }).eq('id', partner.id).then(() => undefined);
  return partner;
}

/**
 * Đối tác gắn với tài khoản đăng nhập: theo auth_user_id, hoặc theo email (chỉ khi email đã được xác minh,
 * để không ai tự đăng ký trùng email đối tác mà vào được).
 */
export async function findPartnerForUser(db: SupabaseClient, user: User): Promise<PartnerAccount | null> {
  const { data: byId } = await db.from('partner_accounts').select('*').eq('auth_user_id', user.id).limit(1);
  if (byId?.[0]) return byId[0] as PartnerAccount;
  const clean = (user.email || '').trim().toLowerCase();
  if (!clean || !user.email_confirmed_at) return null;
  const { data: byEmail } = await db.from('partner_accounts').select('*').ilike('email', likeExact(clean)).is('auth_user_id', null).limit(1);
  const found = (byEmail?.[0] as PartnerAccount | undefined) || null;
  if (found) await db.from('partner_accounts').update({ auth_user_id: user.id }).eq('id', found.id);
  return found;
}

export type PartnerEmailResult = 'invited' | 'reset' | 'staff' | 'failed';

/**
 * Gửi email cho đối tác: lần đầu là email mời tạo mật khẩu, đã kích hoạt rồi thì là email đặt lại mật khẩu.
 * Không gửi cho email nhân sự CRM (để luồng này không đổi được mật khẩu CRM).
 */
export async function sendPartnerEmail(db: SupabaseClient, partner: PartnerAccount, headers: Headers): Promise<PartnerEmailResult> {
  const email = partner.email.trim().toLowerCase();
  if (await isStaffEmail(db, email)) return 'staff';
  const redirectTo = `${publicSiteUrl(headers)}${SET_PASSWORD_PATH}`;
  const link = async (userId: string) => {
    if (userId !== partner.auth_user_id) await db.from('partner_accounts').update({ auth_user_id: userId }).eq('id', partner.id);
  };
  const reset = async () => {
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) console.error('[dienvienvn] Không gửi được email đặt mật khẩu cho đối tác:', error.message);
    return error ? 'failed' : 'reset';
  };

  if (partner.auth_user_id) {
    const { data } = await db.auth.admin.getUserById(partner.auth_user_id);
    if (data?.user && (data.user.last_sign_in_at || data.user.email_confirmed_at)) return reset();
  }

  const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { kind: 'dienvienvn_partner', full_name: partner.full_name }
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      // Email đã có tài khoản DienVienVN (VD: cũng là diễn viên): gắn vào đối tác và gửi email đặt mật khẩu.
      const existing = await findAuthUserByEmail(db, email);
      if (!existing) return 'failed';
      await link(existing.id);
      return reset();
    }
    console.error('[dienvienvn] Không gửi được email mời đối tác:', error.message);
    return 'failed';
  }
  if (data?.user?.id) await link(data.user.id);
  return 'invited';
}

/** Hồ sơ diễn viên đã duyệt (hồ sơ cũ tạo trong CRM chưa có trạng thái được coi là đã duyệt). */
export function approvedTalents(db: SupabaseClient) {
  return db.from('talent_profiles').select('*').or('review_status.is.null,review_status.eq.approved');
}

export function toPartnerTalent(t: TalentProfile): PartnerTalent {
  return {
    ...toProducerTalent(t, false),
    username: t.username || null,
    singing: t.singing || null,
    preferred_project_types: t.preferred_project_types || [],
    preferred_role_types: t.preferred_role_types || []
  };
}
