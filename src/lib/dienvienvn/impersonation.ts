import 'server-only';
import { createHash, randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { CRM_HOST } from './hosts';

/**
 * Giả lập tài khoản (chỉ Super Admin), dùng tài khoản test của CHÍNH Super Admin đó — không giả lập tài khoản người khác.
 * CRM tạo phiên + mã dùng 1 lần → tab dienvienvn.com đổi mã lấy mã phiên → mọi API đọc header này
 * coi như đang là tài khoản test (thao tác là thật, CRM đánh dấu TEST). Không giới hạn thời gian: kết thúc khi bấm Thoát.
 */
export const IMPERSONATE_HEADER = 'x-dvvn-impersonate';
export type ImpersonationKind = 'actor' | 'partner' | 'crew';

export interface ImpersonationSession {
  id: string;
  admin_user_id: string | null;
  admin_email: string;
  target_user_id: string;
  target_kind: ImpersonationKind;
  target_label: string | null;
  created_at: string;
  last_seen_at: string | null;
  ended_at: string | null;
}

export const IMPERSONATION_MISSING = 'Hệ thống chưa sẵn sàng giả lập (cần chạy migration 20261124_impersonation.sql).';
export const KIND_LABEL: Record<ImpersonationKind, string> = { actor: 'Diễn viên', partner: 'Đối tác', crew: 'Ứng viên ekip' };
/** Trang mở đầu tiên khi vào giả lập. */
export const KIND_HOME: Record<ImpersonationKind, string> = { actor: '/tai-khoan', partner: '/doi-tac', crew: '/tai-khoan/ekip' };

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const SESSION_COLUMNS = 'id, admin_user_id, admin_email, target_user_id, target_kind, target_label, created_at, last_seen_at, ended_at';

/** Tạo phiên giả lập; trả mã dùng 1 lần (hết hạn sau 2 phút) để mở tab dienvienvn.com. */
export async function createImpersonation(
  db: SupabaseClient,
  admin: { id: string | null; email: string },
  target: { userId: string; kind: ImpersonationKind; label: string }
): Promise<{ code: string; session: ImpersonationSession } | { error: string }> {
  const code = randomBytes(24).toString('base64url');
  const { data, error } = await db
    .from('impersonation_sessions')
    .insert({
      admin_user_id: admin.id,
      admin_email: admin.email.toLowerCase(),
      target_user_id: target.userId,
      target_kind: target.kind,
      target_label: target.label,
      code_hash: sha(code),
      code_expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString()
    })
    .select(SESSION_COLUMNS)
    .single();
  if (error || !data) return { error: /impersonation_sessions|schema cache/i.test(error?.message || '') ? IMPERSONATION_MISSING : 'Không tạo được phiên giả lập.' };
  return { code, session: data as ImpersonationSession };
}

/** Đổi mã dùng 1 lần lấy mã phiên (chỉ đổi được 1 lần, trong 2 phút). */
export async function exchangeImpersonationCode(db: SupabaseClient, code: string): Promise<{ token: string; session: ImpersonationSession } | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(code)) return null;
  const { data } = await db
    .from('impersonation_sessions')
    .select(`${SESSION_COLUMNS}, code_expires_at, code_used_at`)
    .eq('code_hash', sha(code))
    .maybeSingle();
  const row = data as (ImpersonationSession & { code_expires_at: string | null; code_used_at: string | null }) | null;
  if (!row || row.code_used_at || row.ended_at || !row.code_expires_at || Date.parse(row.code_expires_at) < Date.now()) return null;
  const token = randomBytes(32).toString('base64url');
  const now = new Date().toISOString();
  // Chỉ cập nhật khi mã chưa dùng (chặn 2 tab đổi cùng 1 mã)
  const { data: updated } = await db
    .from('impersonation_sessions')
    .update({ code_used_at: now, code_hash: null, token_hash: sha(token), last_seen_at: now })
    .eq('id', row.id)
    .is('code_used_at', null)
    .select(SESSION_COLUMNS)
    .maybeSingle();
  if (!updated) return null;
  return { token, session: updated as ImpersonationSession };
}

/** Phiên giả lập theo mã phiên trong header. null = không giả lập; 'ended' = có header nhưng phiên đã kết thúc / không hợp lệ. */
export async function findImpersonation(db: SupabaseClient, req: NextRequest): Promise<ImpersonationSession | null | 'ended'> {
  const token = req.headers.get(IMPERSONATE_HEADER)?.trim();
  if (!token) return null;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return 'ended';
  const { data } = await db.from('impersonation_sessions').select(SESSION_COLUMNS).eq('token_hash', sha(token)).maybeSingle();
  const s = data as ImpersonationSession | null;
  if (!s || s.ended_at) return 'ended';
  // Chỉ giả lập tài khoản test của Super Admin
  const { data: test } = await db.from('impersonation_test_accounts').select('id').eq('auth_user_id', s.target_user_id).limit(1);
  if (!test?.length) return 'ended';
  // Người tạo phiên phải vẫn là Super Admin đang hoạt động
  const { data: staff } = await db.from('profiles').select('role, status').ilike('email', s.admin_email.replace(/[\\%_]/g, m => `\\${m}`)).limit(1);
  if (staff?.[0]?.role !== 'super_admin' || staff?.[0]?.status !== 'active') return 'ended';
  void db.from('impersonation_sessions').update({ last_seen_at: new Date().toISOString() }).eq('id', s.id).then(() => undefined);
  return s;
}

/**
 * Người dùng của request: đang giả lập → tài khoản được giả lập; không → tài khoản đăng nhập (Bearer token).
 * Dùng chung cho diễn viên / đối tác / ekip.
 */
export async function requestUser(
  req: NextRequest,
  db: SupabaseClient
): Promise<{ user: User; impersonation: ImpersonationSession | null } | NextResponse> {
  const imp = await findImpersonation(db, req).catch(() => null);
  if (imp === 'ended') {
    return NextResponse.json({ error: 'Phiên giả lập đã kết thúc. Mở lại từ CRM nếu cần.', authRequired: true, impersonationEnded: true }, { status: 401 });
  }
  if (imp) {
    const { data } = await db.auth.admin.getUserById(imp.target_user_id);
    if (!data?.user) return NextResponse.json({ error: 'Tài khoản giả lập không còn tồn tại.', authRequired: true, impersonationEnded: true }, { status: 401 });
    return { user: data.user, impersonation: imp };
  }
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Vui lòng đăng nhập.', authRequired: true }, { status: 401 });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) {
    return NextResponse.json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', authRequired: true }, { status: 401 });
  }
  return { user: data.user, impersonation: null };
}

/* ---------------- Thao tác thật trong lúc giả lập ---------------- */

export type ImpersonationItem = {
  /** Bảng và mã dòng (để CRM đánh dấu TEST) */
  table: 'project_applications' | 'casting_projects' | 'crew_jobs' | 'crew_profiles' | 'crew_applications' | 'crew_cvs' | 'talent_profiles';
  id: string;
  action: 'created' | 'updated';
  label: string;
  /** Link CRM để kiểm tra / xoá */
  crm_url: string;
  /** Mục này hiện trên link shortlist / trang tuyển dụng mà NSX xem */
  visible_to_producer: boolean;
};

const crm = (path: string) => `https://${CRM_HOST}${path}`;
type Row = Record<string, unknown>;
const ok = async (q: PromiseLike<{ data: unknown; error: unknown }>): Promise<Row[]> => {
  try {
    const { data } = await q;
    return (Array.isArray(data) ? data : []) as Row[];
  } catch {
    return [];
  }
};

/** Những gì đã tạo / sửa thật trên tài khoản được giả lập trong khung thời gian của phiên. */
export async function impersonationItems(db: SupabaseClient, s: Pick<ImpersonationSession, 'target_user_id' | 'created_at' | 'ended_at'>): Promise<ImpersonationItem[]> {
  const from = s.created_at;
  const to = s.ended_at || new Date(Date.now() + 60_000).toISOString();
  const uid = s.target_user_id;
  const items: ImpersonationItem[] = [];
  const inWindow = (t: unknown) => typeof t === 'string' && t >= from && t <= to;

  // Diễn viên: sửa hồ sơ, ứng tuyển vai
  const talents = await ok(db.from('talent_profiles').select('id, full_name, created_at, updated_at').eq('auth_user_id', uid));
  for (const t of talents) {
    if (inWindow(t.updated_at) && !inWindow(t.created_at)) {
      items.push({ table: 'talent_profiles', id: String(t.id), action: 'updated', label: `Sửa hồ sơ diễn viên ${t.full_name || ''}`.trim(), crm_url: crm(`/talents/${t.id}`), visible_to_producer: true });
    }
  }
  if (talents.length) {
    const apps = await ok(
      db.from('project_applications').select('id, project_id, role_id, created_at').in('talent_id', talents.map(t => String(t.id))).gte('created_at', from).lte('created_at', to)
    );
    const projectIds = Array.from(new Set(apps.map(a => String(a.project_id))));
    const projects = projectIds.length ? await ok(db.from('casting_projects').select('id, code, title, roles').in('id', projectIds)) : [];
    const byId = new Map(projects.map(p => [String(p.id), p]));
    for (const a of apps) {
      const p = byId.get(String(a.project_id));
      const role = ((p?.roles as { id: string; name: string }[]) || []).find(r => r.id === a.role_id)?.name;
      items.push({
        table: 'project_applications',
        id: String(a.id),
        action: 'created',
        label: `Ứng tuyển ${role ? `vai ${role} – ` : ''}dự án ${p?.title || p?.code || ''}`.trim(),
        crm_url: crm(`/projects/${a.project_id}`),
        visible_to_producer: true
      });
    }
  }

  // Đối tác: dự án casting, tin ekip, đánh dấu Chọn / Cân nhắc / Loại
  const partners = await ok(db.from('partner_accounts').select('id').eq('auth_user_id', uid));
  if (partners.length) {
    const pids = partners.map(p => String(p.id));
    const projects = await ok(db.from('casting_projects').select('id, code, title, created_at, updated_at').in('partner_id', pids).gte('updated_at', from));
    for (const p of projects) {
      if (!inWindow(p.updated_at)) continue;
      const created = inWindow(p.created_at);
      items.push({ table: 'casting_projects', id: String(p.id), action: created ? 'created' : 'updated', label: `${created ? 'Tạo' : 'Sửa'} dự án casting ${p.title || p.code || ''}`.trim(), crm_url: crm(`/projects/${p.id}`), visible_to_producer: true });
    }
    const jobs = await ok(db.from('crew_jobs').select('id, title, created_at, updated_at').in('partner_id', pids).gte('updated_at', from));
    for (const j of jobs) {
      if (!inWindow(j.updated_at)) continue;
      const created = inWindow(j.created_at);
      items.push({ table: 'crew_jobs', id: String(j.id), action: created ? 'created' : 'updated', label: `${created ? 'Đăng' : 'Sửa'} tin tuyển ekip ${j.title || ''}`.trim(), crm_url: crm('/crew-jobs'), visible_to_producer: true });
    }
    const allProjects = await ok(db.from('casting_projects').select('id').in('partner_id', pids));
    if (allProjects.length) {
      const decided = await ok(
        db.from('project_applications').select('id, project_id, producer_decided_at').in('project_id', allProjects.map(p => String(p.id))).gte('producer_decided_at', from).lte('producer_decided_at', to)
      );
      for (const d of decided) {
        items.push({ table: 'project_applications', id: String(d.id), action: 'updated', label: 'Đánh dấu Chọn / Cân nhắc / Loại một ứng viên', crm_url: crm(`/projects/${d.project_id}`), visible_to_producer: true });
      }
    }
  }

  // Ekip: hồ sơ, ứng tuyển, file CV / Portfolio / cover letter
  const crews = await ok(db.from('crew_profiles').select('id, full_name, created_at, updated_at').eq('auth_user_id', uid));
  for (const c of crews) {
    if (inWindow(c.created_at)) items.push({ table: 'crew_profiles', id: String(c.id), action: 'created', label: `Tạo hồ sơ ekip ${c.full_name || ''}`.trim(), crm_url: crm('/crew-profiles'), visible_to_producer: true });
    else if (inWindow(c.updated_at)) items.push({ table: 'crew_profiles', id: String(c.id), action: 'updated', label: `Sửa hồ sơ ekip ${c.full_name || ''}`.trim(), crm_url: crm('/crew-profiles'), visible_to_producer: true });
  }
  if (crews.length) {
    const apps = await ok(db.from('crew_applications').select('id, job_id, created_at').in('crew_profile_id', crews.map(c => String(c.id))).gte('created_at', from).lte('created_at', to));
    const jobIds = Array.from(new Set(apps.map(a => String(a.job_id))));
    const jobs = jobIds.length ? await ok(db.from('crew_jobs').select('id, title').in('id', jobIds)) : [];
    const titles = new Map(jobs.map(j => [String(j.id), String(j.title || '')]));
    for (const a of apps) {
      items.push({ table: 'crew_applications', id: String(a.id), action: 'created', label: `Ứng tuyển tin ekip ${titles.get(String(a.job_id)) || ''}`.trim(), crm_url: crm('/crew-jobs'), visible_to_producer: true });
    }
  }
  const files = await ok(db.from('crew_cvs').select('id, kind, title, created_at').eq('auth_user_id', uid).gte('created_at', from).lte('created_at', to));
  for (const f of files) {
    const kind = f.kind === 'portfolio' ? 'Portfolio' : f.kind === 'cover' ? 'cover letter' : 'CV';
    items.push({ table: 'crew_cvs', id: String(f.id), action: 'created', label: `Tải ${kind}: ${f.title || ''}`.trim(), crm_url: crm('/crew-profiles'), visible_to_producer: false });
  }
  return items;
}

/* ---------------- Tài khoản test của Super Admin ---------------- */

const likeExact = (v: string) => v.trim().toLowerCase().replace(/[\\%_]/g, m => `\\${m}`);

/** Email test: thêm "+dvvn-test-<vai>" vào email của Super Admin → thư gửi tài khoản test vẫn về hộp thư của họ. */
export function testEmailOf(adminEmail: string, kind: ImpersonationKind): string {
  const [local, domain] = adminEmail.trim().toLowerCase().split('@');
  return `${local.split('+')[0]}+dvvn-test-${kind}@${domain}`;
}

/** Mã tài khoản đăng nhập của mọi tài khoản test (để đánh dấu TEST). */
export async function testUserIds(db: SupabaseClient): Promise<string[]> {
  const rows = await ok(db.from('impersonation_test_accounts').select('auth_user_id'));
  return rows.map(r => String(r.auth_user_id));
}

/**
 * Lấy (hoặc tạo lần đầu) tài khoản test của Super Admin cho 1 vai:
 * - Diễn viên: hồ sơ đã duyệt, không hiện công khai.
 * - Nhà sản xuất: tài khoản đối tác đã duyệt.
 * - Ekip: chỉ tạo tài khoản; hồ sơ ekip do Super Admin tự điền (test đúng luồng Form B).
 */
export async function ensureTestAccount(
  db: SupabaseClient,
  admin: { email: string; name: string; phone?: string | null },
  kind: ImpersonationKind
): Promise<{ userId: string; email: string; label: string } | { error: string }> {
  const email = testEmailOf(admin.email, kind);
  const name = admin.name || admin.email.split('@')[0];
  const label = `${name} (TEST)`;
  const { data: saved, error: savedErr } = await db.from('impersonation_test_accounts').select('auth_user_id').ilike('admin_email', likeExact(admin.email)).eq('kind', kind).maybeSingle();
  if (savedErr && /impersonation_test_accounts|schema cache/i.test(savedErr.message)) return { error: 'Hệ thống chưa sẵn sàng giả lập (cần chạy migration 20261125_impersonation_test_accounts.sql).' };

  // Tài khoản đăng nhập (không ai biết mật khẩu, chỉ dùng qua giả lập)
  let userId = (saved?.auth_user_id as string | undefined) || '';
  if (userId) {
    const { data } = await db.auth.admin.getUserById(userId);
    if (!data?.user) userId = '';
  }
  if (!userId) {
    const created = await db.auth.admin.createUser({
      email,
      email_confirm: true,
      password: randomBytes(24).toString('base64url'),
      user_metadata: { full_name: name, dvvn_test: true, kind: `dienvienvn_${kind === 'partner' ? 'partner' : kind === 'crew' ? 'crew' : 'actor'}` }
    });
    if (created.data?.user) userId = created.data.user.id;
    else {
      // Đã có tài khoản với email này (lần trước) → dùng lại
      const { findAuthUser } = await import('@/lib/supabase/account-cleanup');
      const found = await findAuthUser(db, email);
      if (!found) return { error: 'Không tạo được tài khoản test.' };
      userId = found.id;
    }
  }
  if (saved) await db.from('impersonation_test_accounts').update({ auth_user_id: userId, email }).ilike('admin_email', likeExact(admin.email)).eq('kind', kind);
  else await db.from('impersonation_test_accounts').insert({ admin_email: admin.email.toLowerCase(), kind, auth_user_id: userId, email });

  // Hồ sơ theo vai
  if (kind === 'actor') {
    const { data: t } = await db.from('talent_profiles').select('id').eq('auth_user_id', userId).limit(1);
    if (!t?.length) {
      const { error } = await db.from('talent_profiles').insert({
        full_name: label,
        email,
        phone: admin.phone || '',
        auth_user_id: userId,
        submission_source: 'dienvienvn',
        review_status: 'approved',
        public_profile: false
      });
      if (error) {
        console.error('[dienvienvn] Không tạo được hồ sơ diễn viên test:', error.message);
        return { error: 'Không tạo được hồ sơ diễn viên test.' };
      }
    }
  } else if (kind === 'partner') {
    const { data: p } = await db.from('partner_accounts').select('id').eq('auth_user_id', userId).limit(1);
    if (!p?.length) {
      const { error } = await db.from('partner_accounts').insert({
        email,
        full_name: label,
        company: 'DienVienVN TEST',
        partner_type: 'producer',
        status: 'active',
        auth_user_id: userId,
        created_by: admin.email.toLowerCase(),
        note: 'Tài khoản test giả lập của Super Admin'
      });
      if (error) {
        console.error('[dienvienvn] Không tạo được tài khoản đối tác test:', error.message);
        return { error: 'Không tạo được tài khoản nhà sản xuất test.' };
      }
    }
  }
  return { userId, email, label };
}

/** Mã các dòng thuộc tài khoản test (hồ sơ test và mọi thứ chúng tạo ra) để CRM đánh dấu TEST. */
export async function impersonationMarks(db: SupabaseClient): Promise<Record<string, string[]>> {
  const users = await testUserIds(db);
  if (!users.length) return {};
  const ids = (rows: Row[]) => rows.map(r => String(r.id));
  const [talents, partners, crews] = await Promise.all([
    ok(db.from('talent_profiles').select('id').in('auth_user_id', users)),
    ok(db.from('partner_accounts').select('id').in('auth_user_id', users)),
    ok(db.from('crew_profiles').select('id').in('auth_user_id', users))
  ]);
  const [t, p, c] = [ids(talents), ids(partners), ids(crews)];
  const none = ['00000000-0000-0000-0000-000000000000'];
  const [apps, projects, jobs, crewApps] = await Promise.all([
    ok(db.from('project_applications').select('id').in('talent_id', t.length ? t : none)),
    ok(db.from('casting_projects').select('id').in('partner_id', p.length ? p : none)),
    ok(db.from('crew_jobs').select('id').in('partner_id', p.length ? p : none)),
    ok(db.from('crew_applications').select('id').in('crew_profile_id', c.length ? c : none))
  ]);
  return {
    talent_profiles: t,
    partner_accounts: p,
    crew_profiles: c,
    project_applications: ids(apps),
    casting_projects: ids(projects),
    crew_jobs: ids(jobs),
    crew_applications: ids(crewApps)
  };
}

/**
 * Xoá toàn bộ thao tác thật của 1 phiên: dữ liệu tạo mới bị xoá; đánh dấu Chọn / Cân nhắc / Loại được bỏ.
 * Hồ sơ test đã có từ trước và các chỉnh sửa trên hồ sơ test giữ nguyên.
 */
export async function purgeImpersonationItems(db: SupabaseClient, s: Pick<ImpersonationSession, 'target_user_id' | 'created_at' | 'ended_at'>): Promise<{ removed: number; failed: number }> {
  const items = await impersonationItems(db, s);
  let removed = 0;
  let failed = 0;
  const run = async (q: PromiseLike<{ error: unknown }>) => {
    const { error } = await q;
    if (error) failed++;
    else removed++;
  };
  const created = (table: ImpersonationItem['table']) => items.filter(i => i.table === table && i.action === 'created').map(i => i.id);
  // Bỏ đánh dấu của NSX (lượt ứng tuyển của người khác: chỉ bỏ đánh dấu, không xoá)
  for (const i of items.filter(x => x.table === 'project_applications' && x.action === 'updated')) {
    await run(db.from('project_applications').update({ producer_decision: null, producer_decided_at: null }).eq('id', i.id));
  }
  for (const id of created('crew_applications')) await run(db.from('crew_applications').delete().eq('id', id));
  for (const id of created('project_applications')) await run(db.from('project_applications').delete().eq('id', id));
  for (const id of created('crew_jobs')) await run(db.from('crew_jobs').delete().eq('id', id));
  for (const id of created('casting_projects')) await run(db.from('casting_projects').delete().eq('id', id));
  const fileIds = created('crew_cvs');
  if (fileIds.length) {
    const files = await ok(db.from('crew_cvs').select('id, file_path').in('id', fileIds));
    for (const f of files) {
      await run(db.from('crew_cvs').delete().eq('id', String(f.id)));
      if (f.file_path) {
        const { removeFileIfUnused } = await import('./crew-files');
        await removeFileIfUnused(db, String(f.file_path)).catch(() => undefined);
      }
    }
  }
  for (const id of created('crew_profiles')) await run(db.from('crew_profiles').delete().eq('id', id));
  return { removed, failed };
}
