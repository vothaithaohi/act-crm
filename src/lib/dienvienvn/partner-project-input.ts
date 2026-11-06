// Dữ liệu dự án casting đối tác gửi lên từ cổng đối tác (kiểm tra ở máy chủ).
import { z } from 'zod';
import { PROJECT_TYPES } from '@/lib/projects/types';

const text = (max: number) => z.string().trim().max(max).optional().default('');
const age = z.number().int().min(0).max(120).nullable().optional().default(null);

export const partnerRoleSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1, 'Mỗi vai cần có tên').max(120),
  gender: z.enum(['any', 'male', 'female']).default('any'),
  age_min: age,
  age_max: age,
  quantity: z.number().int().min(1).max(999).nullable().optional().default(1),
  description: text(2000)
});

export const partnerProjectSchema = z.object({
  title: z.string().trim().min(2, 'Vui lòng nhập tên dự án').max(160),
  hide_title: z.boolean().default(false),
  production_company: text(160),
  project_type: z.enum(PROJECT_TYPES.map(t => t.id) as [string, ...string[]]).default('feature_film'),
  description: text(5000),
  location: text(80),
  shooting_time: text(160),
  compensation: text(160),
  deadline: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional()
    .or(z.literal(''))
    .default(null),
  roles: z.array(partnerRoleSchema).min(1, 'Cần ít nhất một vai').max(60),
  selftape_required: z.boolean().default(false),
  selftape_brief: text(2000)
});

export type PartnerProjectInput = z.infer<typeof partnerProjectSchema>;

/** Chuẩn hoá thành các cột của bảng casting_projects (chuỗi rỗng → null). */
export function toProjectColumns(input: PartnerProjectInput) {
  const orNull = (v?: string | null) => (v && v.trim() ? v.trim() : null);
  return {
    title: input.title.trim(),
    hide_title: input.hide_title,
    production_company: orNull(input.production_company),
    project_type: input.project_type,
    description: orNull(input.description),
    location: orNull(input.location),
    shooting_time: orNull(input.shooting_time),
    compensation: orNull(input.compensation),
    deadline: orNull(input.deadline || null),
    roles: input.roles.map(r => ({
      id: r.id,
      name: r.name.trim(),
      gender: r.gender,
      age_min: r.age_min ?? null,
      age_max: r.age_max ?? null,
      quantity: r.quantity ?? 1,
      description: (r.description || '').trim()
    })),
    selftape_required: input.selftape_required,
    selftape_brief: orNull(input.selftape_brief)
  };
}

/** Lỗi đầu tiên dễ đọc từ kết quả kiểm tra zod. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Thông tin dự án chưa hợp lệ.';
  if (issue.path[0] === 'deadline') return 'Hạn nộp hồ sơ chưa đúng định dạng ngày.';
  return issue.message && !/^(Expected|Invalid|String must|Number must|Array must)/.test(issue.message) ? issue.message : 'Thông tin dự án chưa hợp lệ.';
}
