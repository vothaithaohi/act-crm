import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { findAuthUserByEmail, isSelfSignup, isStaffEmail } from './actor-server';
import { CRM_HOST, publicSiteUrl } from './hosts';
import { CrewJob, crewJobActive } from './crew-jobs';
import { CrewApplication, CrewProfile, crewPrimaryRoleText } from './crew-profiles';
import { SENIORITY_LEVELS, labelOf } from './crew-taxonomy';
import { sendMail } from './mailer';
import { mailAuthLink } from './auth-mail';
import { requestUser } from './impersonation';
import { authUserInUse } from '@/lib/supabase/account-cleanup';

export const CREW_MISSING = 'Hệ thống chưa sẵn sàng (cần chạy migration 20261115_crew_profiles.sql).';
export const isMissingTable = (e: { message?: string; code?: string } | null) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /crew_profiles|crew_applications|schema cache/i.test(e.message || ''));

const likeExact = (s: string) => s.replace(/[\\%_]/g, m => `\\${m}`);

export async function findCrewByEmail(db: SupabaseClient, email: string): Promise<CrewProfile | null> {
  const { data } = await db.from('crew_profiles').select('*').ilike('public_email', likeExact(email.trim().toLowerCase())).limit(1);
  return (data?.[0] as CrewProfile) || null;
}

/** Người dùng đang đăng nhập (Bearer token) và hồ sơ ekip gắn với tài khoản đó (nếu có). */
export async function getCrewUser(req: NextRequest, db: SupabaseClient): Promise<{ user: User; crew: CrewProfile | null; impersonated?: boolean } | NextResponse> {
  // Đang giả lập (Super Admin) → tài khoản được giả lập; không → tài khoản đăng nhập
  const who = await requestUser(req, db);
  if (who instanceof NextResponse) return who;
  const user = who.user;
  const impersonated = !!who.impersonation;
  const { data: byId } = await db.from('crew_profiles').select('*').eq('auth_user_id', user.id).limit(1);
  if (byId?.[0]) return { user, crew: byId[0] as CrewProfile, impersonated };
  // Gắn theo email chỉ khi email đã được chứng minh (không phải tài khoản tự đặt mật khẩu)
  const email = (user.email || '').trim().toLowerCase();
  if (email && user.email_confirmed_at && !isSelfSignup(user)) {
    const found = await findCrewByEmail(db, email);
    if (found && !found.auth_user_id) {
      await db.from('crew_profiles').update({ auth_user_id: user.id }).eq('id', found.id);
      return { user, crew: { ...found, auth_user_id: user.id }, impersonated };
    }
  }
  return { user, crew: null, impersonated };
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export type CrewSignupResult = 'invited' | 'exists' | 'staff' | 'failed';

/**
 * Đăng ký tài khoản ứng viên ekip: tạo link xác nhận (chỉ chủ hộp thư mới vào được) và tự gửi email nội dung ekip.
 * Email đã có tài khoản DienVienVN (VD: cũng là diễn viên) → báo đăng nhập bằng tài khoản đó.
 */
export async function inviteCrewAccount(db: SupabaseClient, input: { email: string; full_name: string }, headers: Headers): Promise<CrewSignupResult> {
  const email = input.email.trim().toLowerCase();
  if (await isStaffEmail(db, email)) return 'staff';
  const invite = () =>
    mailAuthLink(db, { email, name: input.full_name, audience: 'crew', type: 'invite', purpose: 'confirm', data: { kind: 'dienvienvn_crew', full_name: input.full_name } }, headers);
  const resend = () => mailAuthLink(db, { email, name: input.full_name, audience: 'crew', type: 'recovery', purpose: 'confirm' }, headers);

  const first = await invite();
  if (first.result === 'sent') return 'invited';
  if (first.result === 'failed') return 'failed';

  const existing = await findAuthUserByEmail(db, email);
  if (!existing) return 'failed';
  const activeCrew = existing.user_metadata?.kind === 'dienvienvn_crew' && !!existing.last_sign_in_at;
  // Tài khoản bị bỏ lại (hồ sơ đã bị xoá, không còn gắn với hồ sơ nào): xoá rồi đăng ký lại như email mới.
  // Không áp dụng cho tài khoản ekip đã tạo mật khẩu nhưng chưa điền hồ sơ (vẫn đang dùng).
  if (!activeCrew && !(await authUserInUse(db, existing))) {
    const { error: delErr } = await db.auth.admin.deleteUser(existing.id);
    if (delErr) {
      console.error('[dienvienvn] Không xoá được tài khoản bị bỏ lại:', delErr.message);
      return 'failed';
    }
    return (await invite()).result === 'sent' ? 'invited' : 'failed';
  }
  // Đã đăng ký ekip nhưng chưa bấm link / chưa tạo mật khẩu: gửi lại link xác nhận.
  // Tài khoản khác (diễn viên, đối tác, ekip đã kích hoạt) → đăng nhập bằng tài khoản đó.
  const pendingCrew = existing.user_metadata?.kind === 'dienvienvn_crew' && !isSelfSignup(existing) && !existing.last_sign_in_at;
  if (!pendingCrew) return 'exists';
  return (await resend()).result === 'sent' ? 'invited' : 'failed';
}

/** Tin còn nhận ứng tuyển (đã duyệt, còn hạn). */
export async function openJob(db: SupabaseClient, jobId: string): Promise<CrewJob | null> {
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) return null;
  const { data } = await db.from('crew_jobs').select('*').eq('id', jobId).maybeSingle();
  const job = data as CrewJob | null;
  return job && crewJobActive(job) ? job : null;
}

/** Ứng tuyển một tin. Hồ sơ đã duyệt thì báo NSX ngay; chưa duyệt thì báo khi ACT duyệt hồ sơ. */
export type CrewApplyExtras = Pick<CrewApplication, 'cv_title' | 'cv_path' | 'cv_link' | 'cover_letter' | 'cover_letter_path' | 'portfolio_title' | 'portfolio_path'>;

export async function applyCrewToJob(
  db: SupabaseClient,
  crew: CrewProfile,
  job: CrewJob,
  headers: Headers,
  extras: Partial<CrewApplyExtras> = {},
  /** false: không gửi email báo nhà tuyển dụng (lượt ứng tuyển tạo khi Super Admin giả lập) */
  notify = true
): Promise<'applied' | 'already' | 'failed'> {
  const { data, error } = await db.from('crew_applications').insert({ job_id: job.id, crew_profile_id: crew.id, ...extras }).select('*').single();
  if (error) {
    if (error.code === '23505') return 'already';
    console.error('[dienvienvn] Ứng tuyển ekip lỗi:', error.message);
    return 'failed';
  }
  if (notify && crew.review_status === 'approved') await notifyApplications(db, [data as CrewApplication], headers);
  return 'applied';
}

/** Email báo NSX (người đăng tin) có ứng viên mới. Chỉ gửi một lần cho mỗi lượt ứng tuyển. */
export async function notifyApplications(db: SupabaseClient, apps: CrewApplication[], headers: Headers) {
  const pending = apps.filter(a => !a.notified_at);
  if (!pending.length) return;
  const jobIds = Array.from(new Set(pending.map(a => a.job_id)));
  const profileIds = Array.from(new Set(pending.map(a => a.crew_profile_id)));
  const [{ data: jobs }, { data: profiles }] = await Promise.all([
    db.from('crew_jobs').select('*').in('id', jobIds),
    db.from('crew_profiles').select('*').in('id', profileIds)
  ]);
  const jobById = new Map(((jobs || []) as CrewJob[]).map(j => [j.id, j]));
  const crewById = new Map(((profiles || []) as CrewProfile[]).map(p => [p.id, p]));
  const partnerIds = Array.from(new Set(((jobs || []) as CrewJob[]).map(j => j.partner_id).filter(Boolean))) as string[];
  const { data: partners } = partnerIds.length ? await db.from('partner_accounts').select('id,email').in('id', partnerIds) : { data: [] };
  const partnerEmail = new Map(((partners || []) as { id: string; email: string }[]).map(p => [p.id, p.email]));
  const site = publicSiteUrl(headers);

  for (const app of pending) {
    const job = jobById.get(app.job_id);
    const crew = crewById.get(app.crew_profile_id);
    if (!job || !crew || crew.review_status !== 'approved') continue;
    const to = (job.contact_email || (job.partner_id ? partnerEmail.get(job.partner_id) : '') || '').trim();
    if (!to) continue;
    const link = job.partner_id ? `${site}/doi-tac/tuyen-dung/${job.id}/ung-vien` : `https://${CRM_HOST}/crew-jobs`;
    const name = crew.display_name ? `${crew.full_name} (${crew.display_name})` : crew.full_name;
    const role = crewPrimaryRoleText(crew);
    const level = labelOf(SENIORITY_LEVELS, crew.years_of_experience).split(' (')[0];
    const html = `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1d1d1f">
  <p style="font-size:20px;font-weight:600;margin:0 0 24px">🎬 DienVienVN</p>
  <h2 style="font-size:22px;margin:0 0 12px">Có ứng viên mới cho tin tuyển dụng của bạn.</h2>
  <p style="font-size:15px;line-height:1.5;color:#424245;margin:0 0 8px">Tin: <b>${escapeHtml(job.title)}</b></p>
  <p style="font-size:15px;line-height:1.5;color:#424245;margin:0 0 24px">Ứng viên: <b>${escapeHtml(name)}</b>${role ? ` · ${escapeHtml(role)}` : ''}${level ? ` · ${escapeHtml(level)}` : ''}</p>
  <a href="${link}" style="display:inline-block;background:#1d1d1f;color:#ffffff;text-decoration:none;font-size:15px;padding:12px 24px;border-radius:980px">Xem hồ sơ ứng viên</a>
  <p style="font-size:12px;color:#86868b;margin:28px 0 0">CV, cover letter và thông tin liên hệ của ứng viên có trong trang xem hồ sơ.</p>
</div>`;
    const text = `Có ứng viên mới cho tin "${job.title}": ${name}${role ? ` · ${role}` : ''}. Xem hồ sơ: ${link}`;
    const ok = await sendMail({ to, subject: `DienVienVN – Ứng viên mới cho tin "${job.title}"`, html, text });
    if (ok) await db.from('crew_applications').update({ notified_at: new Date().toISOString() }).eq('id', app.id);
  }
}

/** Hồ sơ ứng viên gửi cho NSX (chỉ hồ sơ đã duyệt): không có mã tài khoản / trạng thái duyệt nội bộ. */
export function toApplicantView(p: CrewProfile, appliedAt: string) {
  const { auth_user_id: _a, review_status: _r, reviewed_at: _v, updated_at: _u, ...rest } = p;
  void _a;
  void _r;
  void _v;
  void _u;
  return { ...rest, applied_at: appliedAt };
}
export type CrewApplicantView = ReturnType<typeof toApplicantView>;
