// Dự án casting: dùng chung cho CRM, trang công khai dienvienvn.com và link gửi nhà sản xuất.

export type ProjectStatus = 'draft' | 'open' | 'closed';
export type ApplicationStatus = 'applied' | 'shortlisted' | 'sent' | 'rejected';
export type RoleGender = 'any' | 'male' | 'female';

export interface ProjectRole {
  id: string;
  name: string;
  gender: RoleGender;
  age_min?: number | null;
  age_max?: number | null;
  quantity?: number | null;
  description?: string;
}

export interface CastingProject {
  id: string;
  code: string;
  title: string;
  hide_title: boolean;
  production_company?: string | null;
  project_type: string;
  description?: string | null;
  location?: string | null;
  shooting_time?: string | null;
  compensation?: string | null;
  deadline?: string | null;
  roles: ProjectRole[];
  selftape_required: boolean;
  selftape_brief?: string | null;
  status: ProjectStatus;
  share_token: string;
  hide_contacts: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectApplication {
  id: string;
  project_id: string;
  role_id: string;
  talent_id: string;
  selftape_url?: string | null;
  note?: string | null;
  status: ApplicationStatus;
  created_at?: string;
  updated_at?: string;
}

/** Thông tin dự án được phép hiển thị công khai (đã lọc tên thật khi bị ẩn). */
export interface PublicProject {
  id: string;
  code: string;
  display_name: string;
  production_company: string | null;
  project_type: string;
  description: string | null;
  location: string | null;
  shooting_time: string | null;
  compensation: string | null;
  deadline: string | null;
  roles: ProjectRole[];
  selftape_required: boolean;
  selftape_brief: string | null;
  status: ProjectStatus;
}

export const PROJECT_TYPES: { id: string; label: string }[] = [
  { id: 'feature_film', label: 'Phim điện ảnh' },
  { id: 'web_drama', label: 'Web drama' },
  { id: 'tv_series', label: 'Phim truyền hình' },
  { id: 'short_film', label: 'Phim ngắn' },
  { id: 'commercial', label: 'Quảng cáo (TVC)' },
  { id: 'music_video', label: 'MV ca nhạc' },
  { id: 'other', label: 'Khác' }
];

export const PROJECT_STATUS_DETAILS: Record<ProjectStatus, { label: string; badgeClass: string }> = {
  draft: { label: 'Nháp', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300' },
  open: { label: 'Đang casting', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300' },
  closed: { label: 'Đã đóng', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300' }
};

export const APPLICATION_STATUS_DETAILS: Record<ApplicationStatus, { label: string; badgeClass: string }> = {
  applied: { label: 'Mới ứng tuyển', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
  shortlisted: { label: 'Shortlist', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  sent: { label: 'Đã gửi NSX', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  rejected: { label: 'Loại', badgeClass: 'bg-slate-100 text-slate-600 border-slate-300' }
};

export function projectTypeLabel(id: string): string {
  return PROJECT_TYPES.find(t => t.id === id)?.label || id;
}

export function genderLabel(g: RoleGender): string {
  return g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : 'Nam / Nữ';
}

export function roleSummary(r: ProjectRole): string {
  const age =
    r.age_min && r.age_max ? `${r.age_min}–${r.age_max} tuổi` : r.age_min ? `từ ${r.age_min} tuổi` : r.age_max ? `đến ${r.age_max} tuổi` : '';
  return [genderLabel(r.gender), age].filter(Boolean).join(' · ');
}

export function publicProjectName(p: Pick<CastingProject, 'hide_title' | 'code' | 'title'>): string {
  return p.hide_title ? `Dự án ${p.code}` : p.title;
}

export function toPublicProject(p: CastingProject): PublicProject {
  return {
    id: p.id,
    code: p.code,
    display_name: publicProjectName(p),
    production_company: p.hide_title ? null : p.production_company || null,
    project_type: p.project_type,
    description: p.description || null,
    location: p.location || null,
    shooting_time: p.shooting_time || null,
    compensation: p.compensation || null,
    deadline: p.deadline || null,
    roles: Array.isArray(p.roles) ? p.roles : [],
    selftape_required: !!p.selftape_required,
    selftape_brief: p.selftape_brief || null,
    status: p.status
  };
}

/** Mã dự án tiếp theo dạng DV-01, DV-02… */
export function nextProjectCode(existing: string[]): string {
  const nums = existing.map(c => /^DV-(\d+)$/i.exec(c.trim())?.[1]).filter(Boolean).map(Number);
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `DV-${String(next).padStart(2, '0')}`;
}

/** Mã link gửi NSX: 12 ký tự chữ thường + số (~62 bit ngẫu nhiên, không đoán được), VD: k3f9x2m8qa7d. */
/**
 * Mã bảo mật của link gửi NSX: 6 ký tự chữ thường + số (~2,2 tỷ khả năng). Máy chủ chặn IP thử sai nhiều lần,
 * nên không thể dò ra mã. Link cũ 12 / 48 ký tự vẫn dùng được.
 */
export const SHARE_TOKEN_LENGTH = 6;

export function newShareToken(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // 252 = 7 × 36: bỏ byte ≥ 252 để mọi ký tự có xác suất như nhau
  let out = '';
  while (out.length < SHARE_TOKEN_LENGTH) {
    for (const b of bytes) if (b < 252 && out.length < SHARE_TOKEN_LENGTH) out += alphabet[b % 36];
    crypto.getRandomValues(bytes);
  }
  return out;
}

export function isDeadlinePassed(deadline?: string | null): boolean {
  if (!deadline) return false;
  const end = Date.parse(`${deadline}T23:59:59+07:00`);
  return Number.isFinite(end) && Date.now() > end;
}

/** Dự án đang nhận hồ sơ: trạng thái "Đang casting" và chưa quá hạn nộp. */
export function isAcceptingApplications(p: Pick<CastingProject, 'status' | 'deadline'>): boolean {
  return p.status === 'open' && !isDeadlinePassed(p.deadline);
}

export function isValidHttpUrl(v: string): boolean {
  return /^https?:\/\/\S+\.\S+/i.test(v.trim());
}

/** Kho tạm cho chế độ demo (chưa cấu hình Supabase). */
export const LOCAL_PROJECTS_KEY = 'dvvn_projects';
export const LOCAL_APPLICATIONS_KEY = 'dvvn_applications';
export const LOCAL_TALENTS_KEYS = ['act_crm_talents_v6', 'dvvn_local_submissions'];

export function readLocal<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocal(key: string, value: unknown[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* bộ nhớ trình duyệt đầy hoặc bị chặn */
  }
}

/** Kiểm tra một đơn ứng tuyển trước khi lưu (dùng cả ở trình duyệt và server). */
export function checkApplication(
  p: Pick<CastingProject, 'status' | 'deadline' | 'roles' | 'selftape_required'>,
  roleId: string,
  selftapeUrl?: string | null
): string | null {
  if (!isAcceptingApplications(p)) return 'Dự án này đã ngừng nhận hồ sơ.';
  if (!(p.roles || []).some(r => r.id === roleId)) return 'Vai ứng tuyển không còn tồn tại trong dự án.';
  const tape = (selftapeUrl || '').trim();
  if (p.selftape_required && !tape) return 'Dự án này bắt buộc gửi link self-tape (YouTube, Google Drive…).';
  if (tape && !isValidHttpUrl(tape)) return 'Link self-tape không hợp lệ (cần bắt đầu bằng http:// hoặc https://).';
  return null;
}

/* ---------------- Đường dẫn dễ đọc theo tên dự án ---------------- */

/** "Một Phim Linh Đình" → "mot-phim-linh-dinh" */
export function slugifyVi(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/** Phần đường dẫn của dự án: tên hiển thị (không lộ tên thật khi "Ẩn tên") + mã dự án, VD: mot-phim-linh-dinh-dv-01. */
export function projectSlug(name: string, code: string): string {
  const n = slugifyVi(name);
  const c = slugifyVi(code);
  if (!c) return n;
  if (!n || n === c || n.endsWith(`-${c}`)) return n || c;
  return `${n}-${c}`;
}

/** Phần đường dẫn của link dự án cho diễn viên: tên hiển thị, VD: mot-phim-linh-dinh ("Ẩn tên" → du-an-dv-01). */
export function projectPathName(name: string, code: string): string {
  return slugifyVi(name) || slugifyVi(code);
}

/**
 * Mức khớp giữa đường dẫn và dự án (0 = không khớp):
 * 3 = đúng tên (mot-phim-linh-dinh), 2 = tên + mã (mot-phim-linh-dinh-dv-01), 1 = kết thúc bằng mã (link cũ khi đã đổi tên).
 */
export function projectSlugScore(param: string, p: Pick<CastingProject, 'code' | 'title' | 'hide_title'>): number {
  const key = param.trim().toLowerCase();
  const name = publicProjectName(p);
  const c = slugifyVi(p.code || '');
  if (key === projectPathName(name, p.code)) return 3;
  if (key === projectSlug(name, p.code)) return 2;
  if (c && (key === c || key.endsWith(`-${c}`))) return 1;
  return 0;
}

export function matchesProjectSlug(param: string, p: Pick<CastingProject, 'code' | 'title' | 'hide_title'>): boolean {
  return projectSlugScore(param, p) > 0;
}

/** Đường dẫn dự án trong cổng đối tác: tên phim thật (đối tác là chủ dự án), VD: mot-phim-linh-dinh. */
export function partnerProjectPath(p: Pick<CastingProject, 'title' | 'code'>): string {
  return slugifyVi(p.title || '') || slugifyVi(p.code || '');
}

/** Lấy mã bí mật từ đường dẫn NSX dạng "ten-du-an-<mã>" (hoặc chỉ "<mã>" với link cũ). */
export function producerTokenFromParam(param: string): string {
  const v = decodeURIComponent(param).trim();
  return v.slice(v.lastIndexOf('-') + 1);
}
