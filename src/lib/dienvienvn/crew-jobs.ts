// Tin tuyển ekip (dienvienvn.com/tuyen-dung): đối tác / ACT đăng, ACT duyệt; người xem liên hệ trực tiếp.
import { z } from 'zod';

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
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Phần hiện công khai (không có partner_id / người tạo). */
export type PublicCrewJob = Pick<
  CrewJob,
  'id' | 'title' | 'company' | 'positions' | 'description' | 'location' | 'work_time' | 'compensation' | 'contact' | 'deadline' | 'created_at'
>;

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

export const crewJobSchema = z.object({
  title: z.string().trim().min(3, 'Vui lòng nhập tiêu đề tin').max(160),
  company: text(160),
  positions: z.array(z.string().trim().min(1).max(60)).min(1, 'Chọn hoặc nhập ít nhất một vị trí').max(20),
  description: text(5000),
  location: text(120),
  work_time: text(160),
  compensation: text(160),
  contact: z.string().trim().min(5, 'Vui lòng nhập cách liên hệ (SĐT, email hoặc link đăng ký)').max(300),
  deadline: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional()
    .or(z.literal(''))
    .default(null)
});

export type CrewJobInput = z.infer<typeof crewJobSchema>;

/** Chuẩn hoá thành cột của bảng crew_jobs (chuỗi rỗng → null). */
export function toCrewJobColumns(input: CrewJobInput) {
  const orNull = (v?: string | null) => (v && v.trim() ? v.trim() : null);
  return {
    title: input.title.trim(),
    company: orNull(input.company),
    positions: Array.from(new Set(input.positions.map(p => p.trim()).filter(Boolean))),
    description: orNull(input.description),
    location: orNull(input.location),
    work_time: orNull(input.work_time),
    compensation: orNull(input.compensation),
    contact: input.contact.trim(),
    deadline: orNull(input.deadline || null)
  };
}

export function toPublicCrewJob(j: CrewJob): PublicCrewJob {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    positions: j.positions || [],
    description: j.description,
    location: j.location,
    work_time: j.work_time,
    compensation: j.compensation,
    contact: j.contact,
    deadline: j.deadline,
    created_at: j.created_at
  };
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
