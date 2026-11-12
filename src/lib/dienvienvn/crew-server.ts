import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { findAuthUserByEmail, isSelfSignup, isStaffEmail, SET_PASSWORD_PATH } from './actor-server';
import { CRM_HOST, publicSiteUrl } from './hosts';
import { CrewJob, crewJobActive } from './crew-jobs';
import { CrewApplication, CrewProfile, crewPrimaryRoleText } from './crew-profiles';
import { SENIORITY_LEVELS, labelOf } from './crew-taxonomy';
import { sendMail } from './mailer';
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

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export type CrewSignupResult = 'invited' | 'exists' | 'staff' | 'failed';

/** Email xác nhận tài khoản ekip (gửi qua Brevo, nội dung riêng cho ứng viên ekip — không dùng mẫu email mời chung của Supabase). */
function crewConfirmEmail(name: string, link: string) {
  const hello = name ? `Xin chào ${escapeHtml(name)},` : 'Xin chào,';
  const html = `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1d1d1f">
  <p style="font-size:20px;font-weight:600;margin:0 0 24px">🎬 DienVienVN</p>
  <h2 style="font-size:22px;margin:0 0 12px">Xác nhận tài khoản ứng viên ekip.</h2>
  <p style="font-size:15px;line-height:1.5;color:#424245;margin:0 0 24px">${hello} bấm nút bên dưới để xác nhận email và tạo mật khẩu. Sau đó bạn hoàn thiện hồ sơ ekip, lưu CV và ứng tuyển việc làm ekip trên DienVienVN.</p>
  <a href="${link}" style="display:inline-block;background:#1d1d1f;color:#ffffff;text-decoration:none;font-size:15px;padding:12px 24px;border-radius:980px">Xác nhận &amp; tạo mật khẩu</a>
  <p style="font-size:12px;line-height:1.5;color:#86868b;margin:28px 0 0">Nếu bạn không đăng ký tài khoản ekip trên DienVienVN, hãy bỏ qua email này.</p>
</div>`;
  const text = `${name ? `Xin chào ${name},` : 'Xin chào,'} bấm link sau để xác nhận email và tạo mật khẩu tài khoản ứng viên ekip DienVienVN: ${link}\n\nNếu bạn không đăng ký tài khoản ekip trên DienVienVN, hãy bỏ qua email này.`;
  return { subject: 'DienVienVN – Xác nhận tài khoản ứng viên ekip', html, text };
}

/**
 * Đăng ký tài khoản ứng viên ekip: tạo link xác nhận (chỉ chủ hộp thư mới vào được) và tự gửi email nội dung ekip.
 * Email đã có tài khoản DienVienVN (VD: cũng là diễn viên) → báo đăng nhập bằng tài khoản đó.
 */
export async function inviteCrewAccount(db: SupabaseClient, input: { email: string; full_name: string }, headers: Headers): Promise<CrewSignupResult> {
  const email = input.email.trim().toLowerCase();
  if (await isStaffEmail(db, email)) return 'staff';
  const site = publicSiteUrl(headers);
  const redirectTo = `${site}${SET_PASSWORD_PATH}`;
  const send = async (type: 'invite' | 'recovery', hashed: string) => {
    const link = `${redirectTo}?token_hash=${encodeURIComponent(hashed)}&type=${type}&for=ekip`;
    return sendMail({ to: email, ...crewConfirmEmail(input.full_name, link) });
  };

  const { data, error } = await db.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo, data: { kind: 'dienvienvn_crew', full_name: input.full_name } }
  });
  if (!error && data?.properties?.hashed_token) return (await send('invite', data.properties.hashed_token)) ? 'invited' : 'failed';
  if (error && !/already|registered|exists/i.test(error.message)) {
    console.error('[dienvienvn] Không tạo được link xác nhận ekip:', error.message);
    return 'failed';
  }
  const existing = await findAuthUserByEmail(db, email);
  if (!existing) return 'failed';
  // Đã đăng ký ekip nhưng chưa bấm link / chưa tạo mật khẩu: gửi lại link xác nhận.
  // Tài khoản khác (diễn viên, đối tác…) → đăng nhập bằng tài khoản đó rồi tạo hồ sơ ekip.
  // Tài khoản bị bỏ lại (hồ sơ đã bị xoá, không còn gắn với hồ sơ nào): xoá rồi đăng ký lại như email mới
  if (!(await authUserInUse(db, existing))) {
    const { error: delErr } = await db.auth.admin.deleteUser(existing.id);
    if (delErr) {
      console.error('[dienvienvn] Không xoá được tài khoản bị bỏ lại:', delErr.message);
      return 'failed';
    }
    const { data: fresh, error: freshErr } = await db.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo, data: { kind: 'dienvienvn_crew', full_name: input.full_name } }
    });
    if (freshErr || !fresh?.properties?.hashed_token) return 'failed';
    return (await send('invite', fresh.properties.hashed_token)) ? 'invited' : 'failed';
  }
  const pendingCrew = existing.user_metadata?.kind === 'dienvienvn_crew' && !isSelfSignup(existing) && !existing.last_sign_in_at;
  if (!pendingCrew) return 'exists';
  const { data: again, error: againErr } = await db.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } });
  if (againErr || !again?.properties?.hashed_token) {
    console.error('[dienvienvn] Không tạo được link xác nhận ekip:', againErr?.message);
    return 'failed';
  }
  return (await send('recovery', again.properties.hashed_token)) ? 'invited' : 'failed';
}

/** Tin còn nhận ứng tuyển (đã duyệt, còn hạn). */
export async function openJob(db: SupabaseClient, jobId: string): Promise<CrewJob | null> {
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) return null;
  const { data } = await db.from('crew_jobs').select('*').eq('id', jobId).maybeSingle();
  const job = data as CrewJob | null;
  return job && crewJobActive(job) ? job : null;
}

/** Ứng tuyển một tin. Hồ sơ đã duyệt thì báo NSX ngay; chưa duyệt thì báo khi ACT duyệt hồ sơ. */
export type CrewApplyExtras = Pick<CrewApplication, 'cv_title' | 'cv_path' | 'cv_link' | 'cover_letter' | 'cover_letter_path'>;

export async function applyCrewToJob(
  db: SupabaseClient,
  crew: CrewProfile,
  job: CrewJob,
  headers: Headers,
  extras: Partial<CrewApplyExtras> = {}
): Promise<'applied' | 'already' | 'failed'> {
  const { data, error } = await db.from('crew_applications').insert({ job_id: job.id, crew_profile_id: crew.id, ...extras }).select('*').single();
  if (error) {
    if (error.code === '23505') return 'already';
    console.error('[dienvienvn] Ứng tuyển ekip lỗi:', error.message);
    return 'failed';
  }
  if (crew.review_status === 'approved') await notifyApplications(db, [data as CrewApplication], headers);
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
