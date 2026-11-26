// Schema kiểm tra dữ liệu hồ sơ diễn viên gửi lên server (chặn dữ liệu sai kiểu / quá dài).
import { z } from 'zod';
import { LinkKind, cleanLink, normalizeLink } from './social-link';

const str = (max: number) => z.string().trim().max(max).default('');
const media = z
  .string()
  .max(4_000_000)
  .refine(v => v === '' || /^https:\/\//.test(v) || /^data:image\/(jpeg|png|webp);base64,/.test(v), 'Ảnh không hợp lệ')
  .default('');
const url = z
  .string()
  .trim()
  .max(500)
  // Tự thêm https:// khi thiếu ("youtu.be/…" → "https://youtu.be/…")
  .transform(v => normalizeLink(v) ?? v)
  .refine(v => v === '' || /^https?:\/\//i.test(v), 'Đường dẫn phải bắt đầu bằng http(s)://')
  .default('');
/** Ô mạng xã hội (không bắt buộc): tự sửa link / tên tài khoản; không hiểu được thì bỏ trống, không chặn nộp hồ sơ */
const social = (kind: LinkKind) => z.string().max(500).transform(v => cleanLink(v, kind)).default('');
const tags = (max = 20) => z.array(z.string().trim().max(60)).max(max).default([]);

const experienceEntry = z.object({
  id: z.string().max(64),
  title: str(200),
  role: z.enum(['leading', 'supporting', 'cameo', 'extra']),
  character: str(200),
  year: str(4)
});
const experienceList = z.array(experienceEntry).max(30).default([]);

const trainingEntry = z.object({
  id: z.string().max(64),
  school: str(200),
  custom_school: str(200),
  act_level: z.enum(['ACT1', 'ACT2', 'ACT3', 'ACT4', 'SSC']),
  program_type: z.enum(['university', 'college', 'intermediate', 'short_course', 'workshop']),
  major: str(200),
  class_code: str(60),
  term_name: str(120),
  start_date: str(10),
  end_date: str(10),
  status: z.enum(['completed', 'studying', 'reserved', 'cancelled']),
  instructor: str(120),
  evaluation: str(1000)
});

export const castingDraftSchema = z.object({
  full_name: str(120),
  gender: z.enum(['male', 'female', 'other']),
  dob: str(10),
  phone: str(20),
  email: str(160),
  address: str(300),
  city: str(80),
  parent_guardian_name: str(200),
  height_cm: str(6),
  weight_kg: str(6),
  shoe_size: str(6),
  chest_cm: str(6),
  waist_cm: str(6),
  hip_cm: str(6),
  tattoos_piercings: tags(),
  experience: z.object({
    feature_films: experienceList,
    web_dramas: experienceList,
    tv_shows: experienceList,
    commercials: experienceList,
    music_videos: experienceList
  }),
  accents: tags(),
  languages: tags(),
  martial_arts: tags(),
  instruments: tags(),
  dancing: tags(),
  sports: tags(),
  willing_work_cities: tags(40),
  role_willingness: tags(),
  headshot_url: media,
  fullbody_url: media,
  compcard_url: media,
  gallery: z
    .array(z.object({ url: media, caption: z.string().trim().max(200).optional().default('') }))
    .max(6)
    .optional()
    .default([]),
  social_links: z.object({
    facebook: social('facebook'),
    instagram: social('instagram'),
    tiktok: social('tiktok'),
    showreel_url: social('showreel')
  }),
  trainings: z.array(trainingEntry).max(20).default([]),
  selftape_url: url,
  consent: z.boolean(),
  public_profile: z.boolean().optional().default(true)
});

/* ---------------- Báo lỗi dễ hiểu: đúng bước, đúng ô ---------------- */

const STEP_TITLE: Record<number, string> = {
  1: 'Thông tin cá nhân',
  2: 'Nhân trắc học & Số đo',
  3: 'Kinh nghiệm diễn xuất',
  4: 'Kỹ năng & Ngôn ngữ',
  5: 'Mức độ sẵn sàng vai',
  6: 'Hình ảnh & Mạng xã hội',
  7: 'Đào tạo diễn xuất'
};
const FIELD_STEP: Record<string, { step: number; label: string }> = {
  full_name: { step: 1, label: 'Họ tên' },
  gender: { step: 1, label: 'Giới tính' },
  dob: { step: 1, label: 'Ngày sinh' },
  phone: { step: 1, label: 'Số điện thoại' },
  email: { step: 1, label: 'Email' },
  address: { step: 1, label: 'Địa chỉ' },
  city: { step: 1, label: 'Tỉnh / thành phố' },
  parent_guardian_name: { step: 1, label: 'Người giám hộ' },
  height_cm: { step: 2, label: 'Chiều cao' },
  weight_kg: { step: 2, label: 'Cân nặng' },
  shoe_size: { step: 2, label: 'Size giày' },
  chest_cm: { step: 2, label: 'Vòng 1' },
  waist_cm: { step: 2, label: 'Vòng 2' },
  hip_cm: { step: 2, label: 'Vòng 3' },
  tattoos_piercings: { step: 2, label: 'Hình xăm / khuyên' },
  experience: { step: 3, label: 'Kinh nghiệm' },
  accents: { step: 4, label: 'Giọng nói vùng miền' },
  languages: { step: 4, label: 'Ngoại ngữ' },
  martial_arts: { step: 4, label: 'Võ thuật' },
  instruments: { step: 4, label: 'Nhạc cụ' },
  dancing: { step: 4, label: 'Vũ đạo' },
  sports: { step: 4, label: 'Thể thao' },
  willing_work_cities: { step: 5, label: 'Địa bàn quay' },
  role_willingness: { step: 5, label: 'Phân cảnh sẵn sàng' },
  headshot_url: { step: 6, label: 'Ảnh chân dung' },
  fullbody_url: { step: 6, label: 'Ảnh toàn thân' },
  compcard_url: { step: 6, label: 'Comp-card' },
  gallery: { step: 6, label: 'Ảnh thêm' },
  social_links: { step: 6, label: 'Mạng xã hội' },
  selftape_url: { step: 6, label: 'Link self-tape' },
  trainings: { step: 7, label: 'Đào tạo' },
  consent: { step: 7, label: 'Đồng ý điều khoản' },
  public_profile: { step: 7, label: 'Hiển thị công khai' }
};
const EXPERIENCE_LABEL: Record<string, { section: string; title: string; character: string }> = {
  feature_films: { section: 'Phim điện ảnh', title: 'Tên phim', character: 'Tên nhân vật' },
  web_dramas: { section: 'Web drama & phim ngắn', title: 'Tên dự án', character: 'Tên nhân vật' },
  tv_shows: { section: 'Phim truyền hình', title: 'Tên phim', character: 'Tên nhân vật' },
  commercials: { section: 'Quảng cáo (TVC)', title: 'Thương hiệu', character: 'Ghi chú' },
  music_videos: { section: 'MV ca nhạc', title: 'Tên bài hát', character: 'Ca sĩ' }
};
const SUB_LABEL: Record<string, string> = {
  year: 'Năm',
  role: 'Vai trò',
  school: 'Tên trường',
  custom_school: 'Tên trường',
  major: 'Chuyên ngành',
  class_code: 'Mã lớp',
  term_name: 'Khoá học',
  start_date: 'Ngày bắt đầu',
  end_date: 'Ngày kết thúc',
  instructor: 'Giảng viên',
  evaluation: 'Nhận xét',
  caption: 'Chú thích ảnh',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  showreel_url: 'Showreel'
};

export type DraftIssue = { step: number; message: string; focusId: string | null };

/** Lỗi kiểm tra hồ sơ → câu tiếng Việt chỉ rõ bước, mục, dòng và ô cần sửa (+ id ô để tự cuộn tới). */
export function describeDraftIssue(issue: z.ZodIssue, draft?: unknown): DraftIssue {
  const [top, ...rest] = issue.path.map(String);
  const meta = FIELD_STEP[top] || { step: 1, label: top };
  const where: string[] = [`Bước ${meta.step} · ${STEP_TITLE[meta.step]}`];
  let field = meta.label;
  let focusId: string | null = null;
  let tip = '';
  if (top === 'experience' && rest[0]) {
    const ex = EXPERIENCE_LABEL[rest[0]];
    const idx = Number(rest[1]);
    const sub = rest[2];
    where.push(ex ? ex.section : rest[0]);
    if (Number.isFinite(idx)) where.push(`dòng ${idx + 1}`);
    field = sub === 'title' ? ex?.title || 'Tên' : sub === 'character' ? ex?.character || 'Nhân vật' : SUB_LABEL[sub] || sub || field;
    const entry = (draft as { experience?: Record<string, { id?: string }[]> } | undefined)?.experience?.[rest[0]]?.[idx];
    if (entry?.id && sub) focusId = `${entry.id}-${sub === 'title' ? 't' : sub === 'character' ? 'c' : sub === 'year' ? 'y' : 'r'}`;
    if (rest[0] === 'commercials' && sub === 'title') tip = ' Mỗi nhãn hàng nên để 1 dòng riêng (bấm "+ Thêm").';
  } else if ((top === 'trainings' || top === 'gallery') && rest.length) {
    if (Number.isFinite(Number(rest[0]))) where.push(`${meta.label} ${Number(rest[0]) + 1}`);
    field = SUB_LABEL[rest[1]] || meta.label;
  } else if (top === 'social_links' && rest[0]) {
    field = SUB_LABEL[rest[0]] || rest[0];
  }
  let problem: string;
  if (issue.code === 'too_big') {
    const max = Number((issue as { maximum?: number | bigint }).maximum);
    problem = (issue as { type?: string }).type === 'array' ? `tối đa ${max} mục` : `dài quá ${max} ký tự, vui lòng rút gọn`;
  } else if (issue.code === 'custom' && /[À-ỹà-ỹ]/.test(issue.message)) {
    problem = issue.message.charAt(0).toLowerCase() + issue.message.slice(1);
  } else if (issue.code === 'invalid_type' || issue.code === 'invalid_enum_value') {
    problem = 'chưa chọn hoặc chưa đúng';
  } else {
    problem = 'chưa hợp lệ';
  }
  return { step: meta.step, message: `${where.join(' · ')} · ${field}: ${problem}.${tip}`, focusId };
}

/** Kiểm tra cả hồ sơ trước khi gửi; null = hợp lệ. */
export function checkDraft(draft: unknown): DraftIssue | null {
  const r = castingDraftSchema.safeParse(draft);
  return r.success ? null : describeDraftIssue(r.error.issues[0], draft);
}
