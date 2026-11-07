import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { SHORTLIST_STATUSES, buildProducerView, toProducerTalent } from '@/lib/projects/producer';
import { TalentProfile } from '@/lib/types/crm';
import { findAuthUserByEmail, isStaffEmail, SET_PASSWORD_PATH } from './actor-server';
import { publicSiteUrl } from './hosts';
import { PartnerAccount, PartnerProjectSummary, PartnerTalent } from './partners';
import { CastingProject, ProjectApplication, newShareToken, nextProjectCode, partnerProjectPath, projectSlugScore, slugifyVi } from '@/lib/projects/types';
import { PartnerProjectInput, toProjectColumns } from './partner-project-input';

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
  if (partner.status === 'pending') {
    return NextResponse.json({ error: 'Tài khoản đối tác đang chờ DienVienVN duyệt. Bạn sẽ nhận email khi tài khoản được kích hoạt.', notPartner: true }, { status: 403 });
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
    // Đối tác đã duyệt: tên đầy đủ, SĐT, email (không có username / ngày sinh / nơi ở)
    ...toProducerTalent(t, false, 'partner'),
    username: null,
    singing: t.singing || null,
    preferred_project_types: t.preferred_project_types || [],
    preferred_role_types: t.preferred_role_types || []
  };
}

/** Ứng viên hiện cho đối tác: chỉ người ACT đã chọn (Shortlist / Đã gửi NSX) và hồ sơ đã duyệt (như link NSX). */
async function visibleApplications(db: SupabaseClient, projectIds: string[]) {
  const { data: apps } = await db.from('project_applications').select('*').in('project_id', projectIds).in('status', SHORTLIST_STATUSES);
  const applications = (apps || []) as ProjectApplication[];
  const talentIds = Array.from(new Set(applications.map(a => a.talent_id)));
  const talents: TalentProfile[] = [];
  for (let i = 0; i < talentIds.length; i += 200) {
    const { data } = await approvedTalents(db).in('id', talentIds.slice(i, i + 200));
    talents.push(...((data || []) as TalentProfile[]));
  }
  return { applications, talents };
}

/** Các dự án được gắn cho đối tác (bỏ bản nháp), kèm số vai và số ứng viên đang hiện. */
export async function partnerProjects(db: SupabaseClient, partner: PartnerAccount): Promise<PartnerProjectSummary[]> {
  const projects = await partnerProjectRows(db, partner);
  if (!projects.length) return [];
  const { applications, talents } = await visibleApplications(db, projects.map(p => p.id));
  const approved = new Set(talents.map(t => t.id));
  return projects.map(p => ({
    id: p.id,
    path: partnerProjectPath(p),
    code: p.code,
    title: p.title,
    production_company: p.production_company || null,
    project_type: p.project_type,
    status: p.status,
    deadline: p.deadline || null,
    roles: (p.roles || []).length,
    applicants: applications.filter(a => a.project_id === p.id && approved.has(a.talent_id)).length,
    own: p.partner_id === partner.id
  }));
}

/** Dự án đối tác xem được: dự án ACT gắn cho đối tác (trừ nháp) + dự án đối tác tự đăng (kể cả đang chờ duyệt). */
async function partnerProjectRows(db: SupabaseClient, partner: PartnerAccount): Promise<CastingProject[]> {
  const ids = partner.project_ids || [];
  const [assigned, own] = await Promise.all([
    ids.length ? db.from('casting_projects').select('*').in('id', ids).neq('status', 'draft') : Promise.resolve({ data: [] as CastingProject[] }),
    db.from('casting_projects').select('*').eq('partner_id', partner.id)
  ]);
  const map = new Map<string, CastingProject>();
  [...((assigned.data || []) as CastingProject[]), ...((own.data || []) as CastingProject[])].forEach(p => map.set(p.id, p));
  return Array.from(map.values()).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

/**
 * Chi tiết 1 dự án cho đối tác: như link shortlist khi đối tác đã duyệt đăng nhập (tên đầy đủ, SĐT, chỉ số).
 * Tìm theo UUID hoặc đường dẫn tên phim (mot-phim-linh-dinh), chỉ trong các dự án được gắn cho đối tác.
 */
export async function partnerProjectView(db: SupabaseClient, partner: PartnerAccount, param: string) {
  const key = decodeURIComponent(param).trim().toLowerCase();
  const list = await partnerProjectRows(db, partner);
  const project =
    list.find(p => p.id === key) ||
    list.find(p => partnerProjectPath(p) === key) ||
    list.find(p => slugifyVi(p.code || '') === key || projectSlugScore(key, p) > 0);
  if (!project) return null;
  const { applications, talents } = await visibleApplications(db, [project.id]);
  const view = buildProducerView({ ...project, hide_contacts: false }, applications, talents);
  const own = project.partner_id === partner.id;
  return {
    ...view,
    id: project.id,
    status: project.status,
    own,
    // Đối tác chỉ sửa được dự án tự đăng khi còn chờ ACT duyệt
    editable: own && project.status === 'draft',
    form: own ? partnerProjectForm(project) : null
  };
}

/** Dữ liệu điền sẵn vào form sửa dự án của đối tác. */
function partnerProjectForm(p: CastingProject) {
  return {
    title: p.title,
    hide_title: p.hide_title,
    production_company: p.production_company || '',
    project_type: p.project_type,
    description: p.description || '',
    location: p.location || '',
    shooting_time: p.shooting_time || '',
    compensation: p.compensation || '',
    deadline: p.deadline || '',
    roles: p.roles || [],
    selftape_required: p.selftape_required,
    selftape_brief: p.selftape_brief || ''
  };
}

/**
 * Đối tác đăng dự án mới: luôn ở trạng thái "Nháp" (chờ ACT duyệt), tự gắn vào tài khoản đối tác.
 * Mã dự án DV-xx tự tăng; trùng mã (2 người đăng cùng lúc) thì thử lại.
 */
export async function createPartnerProject(db: SupabaseClient, partner: PartnerAccount, input: PartnerProjectInput) {
  const columns = toProjectColumns(input);
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: codes } = await db.from('casting_projects').select('code');
    const code = nextProjectCode(((codes || []) as { code: string }[]).map(c => c.code));
    const { data, error } = await db
      .from('casting_projects')
      .insert({
        ...columns,
        production_company: columns.production_company || partner.company || null,
        code,
        status: 'draft',
        share_token: newShareToken(),
        hide_contacts: false,
        partner_id: partner.id
      })
      .select('*')
      .single();
    if (!error) {
      const project = data as CastingProject;
      await db
        .from('partner_accounts')
        .update({ project_ids: Array.from(new Set([...(partner.project_ids || []), project.id])) })
        .eq('id', partner.id);
      return { project };
    }
    if (error.code !== '23505') {
      console.error('[dienvienvn] Đối tác không tạo được dự án:', error.message);
      return { error: /partner_id/.test(error.message) ? 'Hệ thống chưa sẵn sàng cho đối tác đăng dự án. Vui lòng liên hệ DienVienVN.' : 'Không lưu được dự án. Vui lòng thử lại.' };
    }
  }
  return { error: 'Không lưu được dự án. Vui lòng thử lại.' };
}

/** Đối tác sửa dự án tự đăng, chỉ khi còn chờ ACT duyệt. */
export async function updatePartnerProject(db: SupabaseClient, partner: PartnerAccount, id: string, input: PartnerProjectInput) {
  const { data: existing } = await db.from('casting_projects').select('id, status, partner_id').eq('id', id).maybeSingle();
  if (!existing || existing.partner_id !== partner.id) return { error: 'Không tìm thấy dự án.', status: 404 };
  if (existing.status !== 'draft') return { error: 'Dự án đã được ACT duyệt. Vui lòng liên hệ DienVienVN để chỉnh sửa.', status: 409 };
  const { data, error } = await db.from('casting_projects').update(toProjectColumns(input)).eq('id', id).eq('partner_id', partner.id).select('*').single();
  if (error) return { error: 'Không lưu được thay đổi.', status: 500 };
  return { project: data as CastingProject };
}
