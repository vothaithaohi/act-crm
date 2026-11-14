import 'server-only';
import { createHash, randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { CRM_HOST } from './hosts';

/**
 * Giả lập tài khoản người dùng (chỉ Super Admin).
 * CRM tạo phiên + mã dùng 1 lần → tab dienvienvn.com đổi mã lấy mã phiên → mọi API đọc header này
 * coi như đang là tài khoản được giả lập (thao tác là thật). Không tạo phiên đăng nhập của người dùng,
 * không đổi mật khẩu, không gửi email cho họ. Không giới hạn thời gian: kết thúc khi Super Admin bấm Thoát.
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

/** Mã các dòng tạo ra trong lúc giả lập (60 ngày gần nhất) để CRM đánh dấu TEST. */
export async function impersonationMarks(db: SupabaseClient): Promise<Record<string, string[]>> {
  const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
  const { data } = await db.from('impersonation_sessions').select('target_user_id, created_at, ended_at').gte('created_at', since).order('created_at', { ascending: false }).limit(60);
  const marks: Record<string, Set<string>> = {};
  for (const s of (data || []) as ImpersonationSession[]) {
    for (const it of await impersonationItems(db, s)) {
      if (it.action !== 'created') continue;
      (marks[it.table] ||= new Set()).add(it.id);
    }
  }
  return Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, Array.from(v)]));
}
