// Hồ sơ ekip (Form B "Hồ sơ ứng viên / Ekip Freelancer" — tài liệu Trang tuyển dụng) và ứng tuyển tin tuyển ekip.
// Dùng chung cho trình duyệt và máy chủ.
import { z } from 'zod';
import { DEPARTMENTS, OTHER_ID, Option, SENIORITY_LEVELS, roleLabel, roleOf } from './crew-taxonomy';

export type CrewReviewStatus = 'pending' | 'approved' | 'rejected';

export interface CrewRoleRef {
  department: string;
  role_title: string;
  role_other?: string | null;
}

export interface CrewCredit {
  project_name: string;
  year: number | null;
  type: string;
  role_in_project: string;
  project_link: string;
}

export interface CrewProfile {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  display_name: string | null;
  base_city: string | null;
  willing_to_travel: boolean;
  primary_department: string;
  primary_role: string;
  primary_role_other: string | null;
  secondary_roles: CrewRoleRef[];
  years_of_experience: string;
  primary_showreel_url: string | null;
  portfolio_url: string | null;
  /** Link CV (Google Drive, PDF…) */
  cv_url?: string | null;
  filmography_credits: CrewCredit[];
  software_skills: string[];
  owned_gear: string | null;
  availability_status: string;
  busy_until: string | null;
  day_rate: number | null;
  project_rate: number | null;
  rate_negotiable: boolean;
  public_email: string;
  public_phone: string | null;
  phone_verified_only: boolean;
  social_link: string | null;
  review_status: CrewReviewStatus;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrewApplication {
  id: string;
  job_id: string;
  crew_profile_id: string;
  notified_at: string | null;
  created_at: string;
  /** CV + cover letter gửi kèm (bản chụp lúc nộp) */
  cv_title?: string | null;
  cv_path?: string | null;
  cv_link?: string | null;
  cover_letter?: string | null;
  cover_letter_path?: string | null;
}

/** 1 file trong kho của tài khoản ekip: CV (PDF; link cũ vẫn giữ) hoặc cover letter (viết tay hoặc PDF). */
export type CrewFileKind = 'cv' | 'cover';
export interface CrewCv {
  id: string;
  crew_profile_id: string | null;
  auth_user_id: string | null;
  kind: CrewFileKind;
  title: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  link_url: string | null;
  body: string | null;
  is_default: boolean;
  created_at: string;
}

/** CV / cover letter đã nộp, kèm link xem (link tạm có hạn cho file PDF). */
export interface CrewAttachments {
  cv: { title: string; url: string } | null;
  cover_letter: string | null;
  cover_letter_url: string | null;
}

export const CREW_MAX_CVS = 5;
export const CREW_MAX_COVERS = 5;
/** Tải thẳng lên kho (không qua Vercel): tối đa 10MB */
export const CREW_FILE_MAX_BYTES = 10 * 1024 * 1024;
/** Đường dự phòng qua máy chủ (Vercel giới hạn mỗi request ~4,5MB) */
export const CREW_SERVER_UPLOAD_MAX = 4 * 1024 * 1024;
export const COVER_LETTER_MAX = 4000;

export const CREW_REVIEW_STATUS: Record<CrewReviewStatus, { label: string; badge: string }> = {
  pending: { label: 'Chờ duyệt', badge: 'bg-amber-50 text-amber-800 border-amber-300' },
  approved: { label: 'Đang hoạt động', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Đã khoá', badge: 'bg-muted text-muted-foreground border-border' }
};

export const BASE_CITIES: Option[] = [
  { id: 'hcm', label: 'TP.HCM' },
  { id: 'hanoi', label: 'Hà Nội' },
  { id: 'other', label: 'Khác' }
];

export const AVAILABILITY_STATUSES: Option[] = [
  { id: 'available', label: 'Sẵn sàng nhận việc ngay (Available now)' },
  { id: 'busy_until', label: 'Bận đến ngày… (Busy until specific date)' },
  { id: 'part_time', label: 'Chỉ nhận dự án cuối tuần / part-time' }
];

export const CREDIT_TYPES: Option[] = [
  { id: 'feature_film', label: 'Phim điện ảnh' },
  { id: 'mv', label: 'MV' },
  { id: 'tvc', label: 'TVC' },
  { id: 'short_film', label: 'Phim ngắn' }
];

/** Gợi ý phần mềm (vẫn nhập được phần mềm khác). */
export const SOFTWARE_SUGGESTIONS = [
  'DaVinci Resolve',
  'Premiere Pro',
  'After Effects',
  'Final Cut Pro',
  'Avid Media Composer',
  'Pro Tools',
  'Nuke',
  'Blender',
  'Cinema 4D',
  'Maya',
  'Houdini',
  'Photoshop',
  'Final Draft'
];

/** Vai trò chính bắt buộc có link showreel: Đạo diễn, D.O.P, Dựng phim, Chỉnh màu, VFX. */
export const SHOWREEL_REQUIRED_ROLES = [
  'director',
  'director_of_photography_d_o_p_cinematographer',
  'lead_editor_offline_editor',
  'assistant_editor',
  'colorist',
  'vfx_supervisor',
  'compositor_nuke_artist',
  '3d_generalist_3d_modeler_animator'
];

export const CREW_MAX_SECONDARY = 3;
export const CREW_MAX_CREDITS = 20;

const text = (max: number) => z.string().trim().max(max).optional().default('');
const url = z
  .string()
  .trim()
  .max(500)
  .optional()
  .default('')
  .refine(v => !v || /^https?:\/\/\S+\.\S+/i.test(v), 'Link chưa đúng định dạng (cần bắt đầu bằng https://)');
const money = z.coerce.number().int().min(0).max(100_000_000_000).optional().nullable().or(z.literal('')).default(null);
const ids = (list: { id: string }[]) => list.map(o => o.id) as [string, ...string[]];
const departmentIds = [OTHER_ID, ...DEPARTMENTS.map(d => d.id)] as [string, ...string[]];

/** Vị trí hợp lệ theo danh mục (hoặc "Khác" + tên tự nhập). */
function roleIsValid(r: { department: string; role_title: string; role_other?: string }) {
  if (r.role_title === OTHER_ID) return (r.role_other || '').trim().length >= 2;
  return !!roleOf(r.department, r.role_title);
}

const roleRef = z.object({
  department: z.enum(departmentIds, { errorMap: () => ({ message: 'Vui lòng chọn phân nhóm cho vai trò phụ' }) }),
  role_title: z.string().trim().min(1, 'Vui lòng chọn vai trò phụ'),
  role_other: text(120)
});

const credit = z.object({
  project_name: z.string().trim().min(1, 'Vui lòng nhập tên dự án tiêu biểu').max(160),
  year: z.coerce.number().int().min(1950).max(2100).optional().nullable().or(z.literal('')).default(null),
  type: z.enum(ids(CREDIT_TYPES)).optional().or(z.literal('')).default(''),
  role_in_project: text(120),
  project_link: url
});

/** Form B: Hồ sơ ứng viên / Ekip Freelancer. */
export const crewProfileSchema = z
  .object({
    // 1. Thông tin cá nhân & nghệ danh
    full_name: z.string().trim().min(2, 'Vui lòng nhập họ và tên thật').max(120),
    display_name: text(120),
    base_city: z.enum(ids(BASE_CITIES), { errorMap: () => ({ message: 'Vui lòng chọn khu vực hoạt động chính' }) }),
    willing_to_travel: z.boolean().optional().default(false),
    // 2. Chuyên môn chính
    primary_department: z.enum(departmentIds, { errorMap: () => ({ message: 'Vui lòng chọn phân nhóm của vai trò chính' }) }),
    primary_role: z.string().trim().min(1, 'Vui lòng chọn vai trò chính'),
    primary_role_other: text(120),
    secondary_roles: z.array(roleRef).max(CREW_MAX_SECONDARY, `Tối đa ${CREW_MAX_SECONDARY} vai trò phụ`).optional().default([]),
    years_of_experience: z.enum(ids(SENIORITY_LEVELS), { errorMap: () => ({ message: 'Vui lòng chọn số năm kinh nghiệm' }) }),
    // 3. Năng lực & showreel
    primary_showreel_url: url,
    portfolio_url: url,
    cv_url: url,
    filmography_credits: z.array(credit).max(CREW_MAX_CREDITS).optional().default([]),
    software_skills: z.array(z.string().trim().min(1).max(60)).max(30).optional().default([]),
    owned_gear: text(2000),
    // 4. Tình trạng nhận việc & thù lao kỳ vọng
    availability_status: z.enum(ids(AVAILABILITY_STATUSES), { errorMap: () => ({ message: 'Vui lòng chọn trạng thái nhận dự án' }) }),
    busy_until: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')).default(''),
    day_rate: money,
    project_rate: money,
    rate_negotiable: z.boolean().optional().default(false),
    // 5. Kênh liên hệ
    public_email: z.string().trim().toLowerCase().email('Email công việc chưa đúng định dạng').max(160),
    public_phone: z
      .string()
      .trim()
      .max(20)
      .optional()
      .default('')
      .refine(v => !v || /^\+?\d{9,12}$/.test(v.replace(/[\s.-]/g, '')), 'Số điện thoại / Zalo chưa đúng định dạng'),
    phone_verified_only: z.boolean().optional().default(false),
    social_link: url
  })
  .superRefine((v, ctx) => {
    if (!roleIsValid({ department: v.primary_department, role_title: v.primary_role, role_other: v.primary_role_other })) {
      ctx.addIssue({
        code: 'custom',
        path: ['primary_role'],
        message: v.primary_role === OTHER_ID ? 'Vui lòng nhập tên vai trò chính (mục "Khác")' : 'Vui lòng chọn vai trò chính'
      });
    }
    v.secondary_roles.forEach((r, i) => {
      if (!roleIsValid(r)) {
        ctx.addIssue({ code: 'custom', path: ['secondary_roles', i], message: `Vai trò phụ ${i + 1}: vui lòng chọn hoặc nhập tên vị trí` });
      }
    });
    if (SHOWREEL_REQUIRED_ROLES.includes(v.primary_role) && !v.primary_showreel_url) {
      ctx.addIssue({ code: 'custom', path: ['primary_showreel_url'], message: 'Vai trò chính này cần có link showreel' });
    }
    if (v.availability_status === 'busy_until' && !v.busy_until) {
      ctx.addIssue({ code: 'custom', path: ['busy_until'], message: 'Vui lòng chọn ngày bận đến' });
    }
  });

export type CrewProfileInput = z.infer<typeof crewProfileSchema>;

/** Chuẩn hoá thành cột của bảng crew_profiles (chuỗi rỗng → null). */
export function toCrewProfileColumns(v: CrewProfileInput) {
  const orNull = (s?: string | null) => (s && s.trim() ? s.trim() : null);
  const num = (x: unknown) => (x === '' || x === null || x === undefined || Number.isNaN(Number(x)) || !Number(x) ? null : Number(x));
  // Bỏ trùng (không phân biệt hoa thường), giữ cách viết đầu tiên
  const seen = new Set<string>();
  const skills = v.software_skills.filter(s => !seen.has(s.toLowerCase()) && !!seen.add(s.toLowerCase()));
  return {
    full_name: v.full_name.trim(),
    display_name: orNull(v.display_name),
    base_city: v.base_city,
    willing_to_travel: !!v.willing_to_travel,
    primary_department: v.primary_department,
    primary_role: v.primary_role,
    primary_role_other: v.primary_role === OTHER_ID ? orNull(v.primary_role_other) : null,
    secondary_roles: v.secondary_roles.map(r => ({
      department: r.department,
      role_title: r.role_title,
      role_other: r.role_title === OTHER_ID ? orNull(r.role_other) : null
    })),
    years_of_experience: v.years_of_experience,
    primary_showreel_url: orNull(v.primary_showreel_url),
    portfolio_url: orNull(v.portfolio_url),
    cv_url: orNull(v.cv_url),
    filmography_credits: v.filmography_credits.map(c => ({
      project_name: c.project_name.trim(),
      year: num(c.year),
      type: c.type || '',
      role_in_project: c.role_in_project.trim(),
      project_link: c.project_link.trim()
    })),
    software_skills: skills,
    owned_gear: orNull(v.owned_gear),
    availability_status: v.availability_status,
    busy_until: v.availability_status === 'busy_until' ? orNull(v.busy_until) : null,
    day_rate: num(v.day_rate),
    project_rate: num(v.project_rate),
    rate_negotiable: !!v.rate_negotiable,
    public_email: v.public_email.trim().toLowerCase(),
    public_phone: orNull(v.public_phone),
    phone_verified_only: !!v.phone_verified_only,
    social_link: orNull(v.social_link)
  };
}

/** Tên vai trò để hiển thị (vị trí có sẵn hoặc tên tự nhập). */
export function crewRoleText(r: { department?: string | null; role_title?: string | null; role_other?: string | null }): string {
  return roleLabel(r.department, r.role_title, r.role_other)?.vi || '';
}

export const crewPrimaryRoleText = (p: Pick<CrewProfile, 'primary_department' | 'primary_role' | 'primary_role_other'>) =>
  crewRoleText({ department: p.primary_department, role_title: p.primary_role, role_other: p.primary_role_other });

/** Hồ sơ đã có CV hoặc portfolio (dùng khi tin tuyển yêu cầu gửi kèm portfolio/CV). */
export const CV_REQUIRED_MESSAGE = 'Tin này yêu cầu gửi kèm CV. Vui lòng chọn hoặc tải lên 1 CV.';
