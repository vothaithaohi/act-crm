import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { findAuthUserByEmail, isSelfSignup, isStaffEmail, reclaimSelfSignup, SET_PASSWORD_PATH } from './actor-server';
import { CRM_HOST, publicSiteUrl } from './hosts';
import { CrewJob, crewJobActive } from './crew-jobs';
import { CrewApplication, CrewProfile, crewPrimaryRoleText } from './crew-profiles';
import { SENIORITY_LEVELS, labelOf } from './crew-taxonomy';
import { sendMail } from './mailer';

export const CREW_MISSING = 'Hệ thống chưa sẵn sàng (cần chạy migration 20261115_crew_profiles.sql).';
export const isMissingTable = (e: { message?: string; code?: string } | null) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /crew_profiles|crew_applications|schema cache/i.test(e.message || ''));

const likeExact = (s: string) => s.replace(/[\\%_]/g, m => `\\${m}`);

export async function findCrewByEmail(db: SupabaseClient, email: string): Promise<CrewProfile | null> {
  const { data } = await db.from('crew_profiles').select('*').ilike('public_email', likeExact(email.trim().toLowerCase())).limit(1);
  return (data?.[0] as CrewProfile) || null;
}

/** Người dùng đang đăng nhập (Bearer token) và hồ sơ ekip gắn với tài khoản đó (nếu có). */
export async function getCrewUser(req: NextRequest, db: SupabaseClient): Promise<{ user: User; crew: CrewProfile | null } | NextResponse> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Vui lòng đăng nhập.', authRequired: true }, { status: 401 });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) {
    return NextResponse.json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', authRequired: true }, { status: 401 });
  }
  const user = data.user;
  const { data: byId } = await db.from('crew_profiles').select('*').eq('auth_user_id', user.id).limit(1);
  if (byId?.[0]) return { user, crew: byId[0] as CrewProfile };
  // Gắn theo email chỉ khi email đã được chứng minh (không phải tài khoản tự đặt mật khẩu)
  const email = (user.email || '').trim().toLowerCase();
  if (email && user.email_confirmed_at && !isSelfSignup(user)) {
    const found = await findCrewByEmail(db, email);
    if (found && !found.auth_user_id) {
      await db.from('crew_profiles').update({ auth_user_id: user.id }).eq('id', found.id);
      return { user, crew: { ...found, auth_user_id: user.id } };
    }
  }
  return { user, crew: null };
}

export type CrewEmailResult = 'invited' | 'reset' | 'staff' | 'failed';

/**
 * Email tài khoản cho hồ sơ ekip mới (giống diễn viên): chưa có tài khoản → email xác thực & tạo mật khẩu;
 * email đã có tài khoản DienVienVN (VD: cũng là diễn viên) → gắn hồ sơ vào tài khoản đó và gửi email đặt mật khẩu.
 */
export async function sendCrewAccountEmail(db: SupabaseClient, crew: CrewProfile, headers: Headers): Promise<CrewEmailResult> {
  const email = crew.public_email.trim().toLowerCase();
  if (await isStaffEmail(db, email)) return 'staff';
  const redirectTo = `${publicSiteUrl(headers)}${SET_PASSWORD_PATH}`;
  const link = (userId: string) => db.from('crew_profiles').update({ auth_user_id: userId }).eq('id', crew.id);
  const reset = async () => {
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) console.error('[dienvienvn] Không gửi được email đặt mật khẩu cho ekip:', error.message);
    return error ? 'failed' : 'reset';
  };

  const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { kind: 'dienvienvn_crew', full_name: crew.full_name }
  });
  if (error) {
    if (!/already|registered|exists/i.test(error.message)) {
      console.error('[dienvienvn] Không gửi được email mời ekip:', error.message);
      return 'failed';
    }
    const existing = await findAuthUserByEmail(db, email);
    if (!existing) return 'failed';
    if (isSelfSignup(existing)) {
      const newId = await reclaimSelfSignup(db, existing, redirectTo);
      if (!newId) return 'failed';
      await link(newId);
      return 'invited';
    }
    await link(existing.id);
    return reset();
  }
  if (data?.user?.id) await link(data.user.id);
  return 'invited';
}

/** Tin còn nhận ứng tuyển (đã duyệt, còn hạn). */
export async function openJob(db: SupabaseClient, jobId: string): Promise<CrewJob | null> {
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) return null;
  const { data } = await db.from('crew_jobs').select('*').eq('id', jobId).maybeSingle();
  const job = data as CrewJob | null;
  return job && crewJobActive(job) ? job : null;
}

/** Ứng tuyển một tin. Hồ sơ đã duyệt thì báo NSX ngay; chưa duyệt thì báo khi ACT duyệt hồ sơ. */
export async function applyCrewToJob(
  db: SupabaseClient,
  crew: CrewProfile,
  job: CrewJob,
  headers: Headers
): Promise<'applied' | 'already' | 'failed'> {
  const { data, error } = await db.from('crew_applications').insert({ job_id: job.id, crew_profile_id: crew.id }).select('*').single();
  if (error) {
    if (error.code === '23505') return 'already';
    console.error('[dienvienvn] Ứng tuyển ekip lỗi:', error.message);
    return 'failed';
  }
  if (crew.review_status === 'approved') await notifyApplications(db, [data as CrewApplication], headers);
  return 'applied';
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

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
  <p style="font-size:12px;color:#86868b;margin:28px 0 0">Hồ sơ ứng viên đã được DienVienVN duyệt. Thông tin liên hệ của ứng viên có trong trang xem hồ sơ.</p>
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
