// Tin tuyển ekip (dienvienvn.com/tuyen-dung): đối tác / ACT đăng, ACT duyệt; người xem liên hệ trực tiếp.
import { z } from 'zod';
import {
  COMPANY_TYPES,
  CREW_PROJECT_TYPES,
  DEPARTMENTS,
  EMPLOYMENT_TYPES,
  PROJECT_PHASES,
  SALARY_TYPES,
  SENIORITY_LEVELS,
  WORK_CITIES,
  WORK_MODES,
  OTHER_ID,
  roleLabel,
  roleOf
} from './crew-taxonomy';

export type CrewJobStatus = 'draft' | 'open' | 'closed';

export interface CrewJob {
  id: string;
  partner_id: string | null;
  title: string;
  company: string | null;
  positions: string[];
  description: string | null;
  location: string | null;
  work_time: string | null;
  compensation: string | null;
  contact: string;
  deadline: string | null;
  status: CrewJobStatus;
  // Form A (tài liệu Trang tuyển dụng)
  company_type?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  project_name?: string | null;
  project_hidden?: boolean | null;
  project_type?: string | null;
  project_phase?: string | null;
  department?: string | null;
  role_title?: string | null;
  /** Tên vị trí tự nhập khi chọn "Khác". */
  role_other?: string | null;
  /** Yêu cầu ứng viên gửi kèm portfolio / CV. */
  requires_cv?: boolean | null;
  /** Các vị trí đăng cùng một lần (cùng dự án) có chung group_id. */
  group_id?: string | null;
  seniority_level?: string | null;
  employment_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  shooting_days?: number | null;
  city?: string | null;
  location_detail?: string | null;
  work_mode?: string | null;
  salary_type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Phần hiện công khai (không có partner_id / người tạo / liên hệ của NSX; tên dự án bảo mật đã bị bỏ). Ứng tuyển qua DienVienVN. */
export type PublicCrewJob = Omit<CrewJob, 'partner_id' | 'status' | 'created_by' | 'updated_at' | 'project_hidden' | 'contact' | 'contact_email' | 'contact_phone'>;

export const CREW_JOB_STATUS: Record<CrewJobStatus, { label: string; badge: string }> = {
  draft: { label: 'Chờ duyệt', badge: 'bg-amber-50 text-amber-800 border-amber-300' },
  open: { label: 'Đang tuyển', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  closed: { label: 'Đã đóng', badge: 'bg-muted text-muted-foreground border-border' }
};

/** Gợi ý vị trí thường gặp (vẫn nhập được vị trí khác). */
export const CREW_POSITION_SUGGESTIONS = [
  'Trợ lý casting',
  'Điều phối audition',
  'Quay phim',
  'Ánh sáng',
  'Âm thanh',
  'Trang điểm',
  'Phục trang',
  'Đạo cụ',
  'Trợ lý đạo diễn',
  'Thư ký trường quay',
  'Hậu kỳ / dựng phim'
];

const text = (max: number) => z.string().trim().max(max).optional().default('');
const optEnum = (ids: string[]) => z.enum(ids as [string, ...string[]]).optional().or(z.literal('')).default('');
const enumOf = (list: { id: string }[], msg: string) => z.enum(list.map(o => o.id) as [string, ...string[]], { errorMap: () => ({ message: msg }) });
const date = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')).default('');
const money = z.coerce.number().int().min(0).max(100_000_000_000).optional().nullable().or(z.literal('')).default(null);

/** Form A: Đăng tin tuyển dụng (Production House / Producer / Đạo diễn). */
export const crewJobSchema = z
  .object({
    // 1. Thông tin đơn vị tuyển dụng
    company_name: z.string().trim().min(2, 'Vui lòng nhập tên đơn vị tuyển dụng').max(160),
    company_type: enumOf(COMPANY_TYPES, 'Vui lòng chọn loại hình đơn vị'),
    contact_email: z.string().trim().email('Email nhận CV/Showreel chưa đúng định dạng').max(160),
    contact_phone: z
      .string()
      .trim()
      .max(20)
      .refine(v => /^\+?\d{9,12}$/.test(v.replace(/[\s.-]/g, '')), 'Số điện thoại / Zalo chưa đúng định dạng'),
    // 2. Thông tin dự án
    project_name: text(160),
    project_hidden: z.boolean().optional().default(false),
    project_type: enumOf(CREW_PROJECT_TYPES, 'Vui lòng chọn loại hình dự án'),
    project_phase: optEnum(PROJECT_PHASES.map(o => o.id)),
    // 3. Vị trí & yêu cầu chuyên môn
    department: enumOf([...DEPARTMENTS, { id: OTHER_ID }], 'Vui lòng chọn phân nhóm chuyên môn'),
    role_title: z.string().trim().min(1, 'Vui lòng chọn vị trí cụ thể'),
    role_other: text(120),
    // Mô tả công việc (JD) của vị trí
    description: text(3000),
    requires_cv: z.boolean().optional().default(false),
    seniority_level: enumOf(SENIORITY_LEVELS, 'Vui lòng chọn cấp độ kinh nghiệm'),
    // 4. Thời gian & hình thức làm việc
    employment_type: enumOf(EMPLOYMENT_TYPES, 'Vui lòng chọn hình thức hợp đồng'),
    start_date: date,
    end_date: date,
    shooting_days: z.coerce.number().int().min(0).max(1000).optional().nullable().or(z.literal('')).default(null),
    city: optEnum(WORK_CITIES.map(o => o.id)),
    location_detail: text(200),
    work_mode: optEnum(WORK_MODES.map(o => o.id)),
    // 5. Ngân sách & thù lao
    salary_type: enumOf(SALARY_TYPES, 'Vui lòng chọn cách tính thù lao'),
    salary_min: money,
    salary_max: money
  })
  .superRefine((v, ctx) => {
    if (v.role_title === OTHER_ID) {
      if (v.role_other.length < 2) ctx.addIssue({ code: 'custom', path: ['role_other'], message: 'Vui lòng nhập tên vị trí (mục "Khác")' });
    } else if (!roleOf(v.department, v.role_title)) {
      ctx.addIssue({ code: 'custom', path: ['role_title'], message: 'Vui lòng chọn vị trí cụ thể' });
    }
    if (v.start_date && v.end_date && v.end_date < v.start_date) {
      ctx.addIssue({ code: 'custom', path: ['end_date'], message: 'Ngày kết thúc phải sau ngày bắt đầu' });
    }
    const [lo, hi] = [Number(v.salary_min) || 0, Number(v.salary_max) || 0];
    if (lo && hi && lo > hi) ctx.addIssue({ code: 'custom', path: ['salary_max'], message: 'Mức tối đa phải lớn hơn mức tối thiểu' });
  });

export type CrewJobInput = z.infer<typeof crewJobSchema>;

/** Chuẩn hoá thành cột của bảng crew_jobs (chuỗi rỗng → null; tiêu đề / liên hệ / vị trí tính sẵn cho trang công khai). */
export function toCrewJobColumns(input: CrewJobInput) {
  const orNull = (v?: string | null) => (v && v.trim() ? v.trim() : null);
  const num = (v: unknown) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
  const role = roleLabel(input.department, input.role_title, input.role_other);
  const project = input.project_hidden ? null : orNull(input.project_name);
  return {
    title: [role?.vi || 'Tuyển dụng', project].filter(Boolean).join(' – '),
    company: input.company_name.trim(),
    positions: role ? [role.vi] : [],
    contact: [input.contact_email.trim(), input.contact_phone.trim()].join(' · '),
    company_type: input.company_type,
    contact_email: input.contact_email.trim(),
    contact_phone: input.contact_phone.trim(),
    project_name: orNull(input.project_name),
    project_hidden: !!input.project_hidden,
    project_type: input.project_type,
    project_phase: orNull(input.project_phase),
    department: input.department,
    role_title: input.role_title,
    role_other: input.role_title === OTHER_ID ? input.role_other.trim() : null,
    description: orNull(input.description),
    requires_cv: !!input.requires_cv,
    seniority_level: input.seniority_level,
    employment_type: input.employment_type,
    start_date: orNull(input.start_date),
    end_date: orNull(input.end_date),
    shooting_days: num(input.shooting_days),
    city: orNull(input.city),
    location_detail: orNull(input.location_detail),
    work_mode: orNull(input.work_mode),
    salary_type: input.salary_type,
    salary_min: input.salary_type === 'negotiable' ? null : num(input.salary_min),
    salary_max: input.salary_type === 'negotiable' ? null : num(input.salary_max),
    currency: 'VND'
  };
}

/** Số vị trí tối đa đăng trong một lần. */
export const CREW_MAX_POSITIONS = 10;

/** Các trường riêng của từng vị trí (phần còn lại của Form A dùng chung cho cả dự án). */
export const CREW_POSITION_KEYS = ['department', 'role_title', 'role_other', 'description', 'seniority_level', 'salary_type', 'salary_min', 'salary_max'] as const;

/**
 * Một lần đăng nhiều vị trí: { ...thông tin chung, positions: [{ department, role_title, … }] } → mỗi vị trí là một tin.
 * Không có positions thì coi như một vị trí (cách gửi cũ / khi sửa một tin).
 */
export function parseCrewJobBatch(body: unknown): { ok: true; inputs: CrewJobInput[] } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Thông tin chưa hợp lệ.' };
  const { positions, ...shared } = body as Record<string, unknown>;
  const list = Array.isArray(positions) ? positions : [{}];
  if (list.length === 0) return { ok: false, error: 'Vui lòng thêm ít nhất một vị trí.' };
  if (list.length > CREW_MAX_POSITIONS) return { ok: false, error: `Mỗi lần đăng tối đa ${CREW_MAX_POSITIONS} vị trí.` };
  const inputs: CrewJobInput[] = [];
  for (let i = 0; i < list.length; i++) {
    const p = list[i] && typeof list[i] === 'object' ? (list[i] as Record<string, unknown>) : {};
    const own = Object.fromEntries(CREW_POSITION_KEYS.filter(k => k in p).map(k => [k, p[k]]));
    const parsed = crewJobSchema.safeParse({ ...shared, ...own });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Thông tin chưa hợp lệ.';
      const positionField = CREW_POSITION_KEYS.includes(parsed.error.issues[0]?.path[0] as (typeof CREW_POSITION_KEYS)[number]);
      return { ok: false, error: list.length > 1 && positionField ? `Vị trí ${i + 1}: ${msg}` : msg };
    }
    inputs.push(parsed.data);
  }
  return { ok: true, inputs };
}

export function toPublicCrewJob(j: CrewJob): PublicCrewJob {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { partner_id, status, created_by, updated_at, project_hidden, contact, contact_email, contact_phone, ...rest } = j;
  return { ...rest, positions: j.positions || [], project_name: project_hidden ? null : j.project_name || null };
}

/** Tin còn hạn: chưa có hạn, hoặc hạn từ hôm nay trở đi (giờ Việt Nam). */
export function crewJobActive(j: Pick<CrewJob, 'status' | 'deadline'>): boolean {
  if (j.status !== 'open') return false;
  if (!j.deadline) return true;
  const end = Date.parse(`${j.deadline}T23:59:59+07:00`);
  return !Number.isFinite(end) || Date.now() <= end;
}

/** Biến "0901 234 567" / email / link trong thông tin liên hệ thành link bấm được. */
export function contactHref(contact: string): string | null {
  const c = contact.trim();
  if (/^https?:\/\//i.test(c)) return c;
  if (/^\S+@\S+\.\S+$/.test(c)) return `mailto:${c}`;
  const digits = c.replace(/[^\d+]/g, '');
  if (/^\+?\d{9,12}$/.test(digits) && digits.length >= c.replace(/\s/g, '').length - 2) return `tel:${digits}`;
  return null;
}
