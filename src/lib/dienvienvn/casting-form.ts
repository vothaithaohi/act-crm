// Cấu hình & logic dùng chung cho form nộp hồ sơ diễn viên trên dienvienvn.com.
// Các giá trị lựa chọn khớp 1-1 với form "Thêm Hồ Sơ Casting" và bộ lọc Casting Matching của CRM.

import {
  ACTCourseEnrollment,
  ACTCourseLevel,
  AcademicProfile,
  ActingExperience,
  EnrollmentStatus,
  ExternalTraining,
  GenderType,
  SocialLinks,
  TalentProfile
} from '@/lib/types/crm';
import { ACT_ACADEMY_SCHOOL, OTHER_SCHOOL, findArtSchool } from './schools';

/** Thời điểm ra mắt chính thức: 00:00:00 ngày 11/11/2026 theo giờ Việt Nam (GMT+7). */
export const LAUNCH_AT_ISO = '2026-11-11T00:00:00+07:00';
export const LAUNCH_AT_MS = Date.parse(LAUNCH_AT_ISO);

export const CASTING_STEPS = [
  { id: 1, title: 'Thông tin cá nhân', desc: 'Họ tên, ngày sinh, liên hệ' },
  { id: 2, title: 'Nhân trắc học & Số đo', desc: 'Chiều cao, cân nặng, 3 vòng' },
  { id: 3, title: 'Kinh nghiệm diễn xuất', desc: 'Phim, web drama, TVC, MV' },
  { id: 4, title: 'Kỹ năng & Ngôn ngữ', desc: 'Giọng nói, ngoại ngữ, võ thuật' },
  { id: 5, title: 'Mức độ sẵn sàng vai', desc: 'Địa bàn quay, phân cảnh đặc biệt' },
  { id: 6, title: 'Hình ảnh & Mạng xã hội', desc: 'Headshot, toàn thân, showreel' },
  { id: 7, title: 'Đào tạo diễn xuất', desc: 'ACT Academy hoặc trường khác' }
] as const;

export const TATTOO_OPTIONS = [
  { id: 'none', label: 'Không có hình xăm' },
  { id: 'arms_shoulder', label: 'Cánh tay / Vai' },
  { id: 'legs_feet', label: 'Chân / Cổ chân' },
  { id: 'stomach', label: 'Bụng / Lưng' },
  { id: 'unseen', label: 'Vị trí kín (không lộ)' },
  { id: 'face_neck', label: 'Cổ / Mặt' }
];

export const ACCENT_OPTIONS = ['Nam', 'Bắc', 'Trung', 'Huế'];
export const LANGUAGE_OPTIONS = ['Tiếng Anh', 'Tiếng Hàn', 'Tiếng Trung', 'Tiếng Nhật', 'Tiếng Pháp', 'Tiếng Thái', 'Tiếng Đức', 'Tiếng Tây Ban Nha', 'Tiếng Nga', 'Tiếng Ý'];
export const MARTIAL_ARTS_OPTIONS = [
  'Boxing', 'Vovinam', 'Taekwondo', 'Karate', 'Muay Thai', 'Võ Cổ Truyền',
  'Judo', 'Aikido', 'Wushu / Kungfu', 'Vịnh Xuân', 'Kickboxing', 'Jiu-jitsu', 'Đấu kiếm', 'Cascadeur'
];
/** Kỹ năng tự thêm ngoài danh sách có sẵn: tối đa 60 ký tự / mục, 20 mục / nhóm. */
export const CUSTOM_SKILL_MAX_LENGTH = 60;
export const SKILL_GROUP_MAX = 20;

/**
 * Chuẩn hoá danh sách kỹ năng: bỏ khoảng trắng thừa, trùng với mục có sẵn (không phân biệt hoa thường)
 * thì dùng đúng tên có sẵn, bỏ trùng, giới hạn độ dài và số mục.
 */
export function normalizeSkills(options: string[], values: (string | undefined | null)[]): string[] {
  const out: string[] = [];
  for (const raw of values) {
    const v = (raw || '').replace(/\s+/g, ' ').trim().slice(0, CUSTOM_SKILL_MAX_LENGTH);
    if (!v) continue;
    const canonical = options.find(o => o.toLowerCase() === v.toLowerCase()) || v.charAt(0).toUpperCase() + v.slice(1);
    if (!out.some(x => x.toLowerCase() === canonical.toLowerCase())) out.push(canonical);
  }
  return out.slice(0, SKILL_GROUP_MAX);
}
export const INSTRUMENT_OPTIONS = ['Guitar', 'Piano', 'Trống', 'Ukulele', 'Violin'];
export const DANCE_OPTIONS = ['Kpop', 'Contemporary', 'Hip-hop', 'Ballet'];
export const SPORT_OPTIONS = ['Bơi lội', 'Điền kinh', 'Cầu lông', 'Bắn súng', 'Gym / Fitness'];
/** Địa bàn quay hiển thị sẵn; các tỉnh/thành khác được thêm qua danh sách 34 tỉnh/thành. */
export const CITY_OPTIONS = ['TP.HCM', 'Hà Nội', 'Đà Nẵng', 'Nước ngoài'];

/**
 * Mỗi lựa chọn có thể ghi nhiều mã (ids) để giữ tương thích với bộ lọc CRM
 * (VD: "Đồ bơi / Bikini / Nội y" ghi cả swimsuit và lingerie).
 */
export const ROLE_WILLINGNESS_OPTIONS: { key: string; ids: string[]; label: string }[] = [
  { key: 'kissing', ids: ['kissing_scene', 'intimate_scene'], label: 'Sẵn sàng đóng cảnh hôn & cảnh nóng 18+' },
  { key: 'swimwear', ids: ['swimsuit', 'lingerie'], label: 'Sẵn sàng mặc đồ bơi / bikini / nội y' },
  { key: 'nudity', ids: ['partial_nudity'], label: 'Sẵn sàng cảnh bán khỏa thân nghệ thuật' },
  { key: 'hair_color', ids: ['hair_color'], label: 'Sẵn sàng thay đổi màu tóc theo tạo hình vai diễn' },
  { key: 'cut_hair', ids: ['cut_hair'], label: 'Sẵn sàng cắt tóc ngắn theo tạo hình vai diễn' },
  { key: 'learn', ids: ['learn_new_skills'], label: 'Sẵn sàng học ngoại ngữ hoặc kỹ năng mới' }
];

export const FILM_ROLE_OPTIONS = [
  { id: 'leading', label: 'Vai chính' },
  { id: 'supporting', label: 'Vai phụ' },
  { id: 'cameo', label: 'Cameo' },
  { id: 'extra', label: 'Quần chúng' }
] as const;

export const ACT_LEVEL_OPTIONS: { id: ACTCourseLevel; label: string }[] = [
  { id: 'ACT1', label: 'ACT 1 - Căn bản & Hình thể' },
  { id: 'ACT2', label: 'ACT 2 - Tâm lý nhân vật' },
  { id: 'ACT3', label: 'ACT 3 - Trước ống kính 4K' },
  { id: 'ACT4', label: 'ACT 4 - Điện ảnh chuyên nghiệp' },
  { id: 'SSC', label: 'SSC - Khóa kỹ năng bổ trợ' }
];

export const ENROLLMENT_STATUS_OPTIONS: { id: EnrollmentStatus; label: string }[] = [
  { id: 'completed', label: 'Đã tốt nghiệp / Hoàn thành' },
  { id: 'studying', label: 'Đang theo học' },
  { id: 'reserved', label: 'Bảo lưu' },
  { id: 'cancelled', label: 'Chuyển khóa / Dừng học' }
];

export type ExperienceKind = 'feature_films' | 'web_dramas' | 'tv_shows' | 'commercials' | 'music_videos';

/** Một dòng kinh nghiệm trong form (gộp chung cho phim, TVC, MV để nhập liệu đơn giản). */
export interface ExperienceEntry {
  id: string;
  title: string;
  role: 'leading' | 'supporting' | 'cameo' | 'extra';
  character: string;
  year: string;
}

/** Một dòng đào tạo trong form: ACT Academy hoặc cơ sở khác. */
export interface TrainingEntry {
  id: string;
  school: string; // 'ACT Academy' | tên trường trong danh mục | 'Cơ sở khác / Tự nhập'
  custom_school: string;
  act_level: ACTCourseLevel;
  program_type: ExternalTraining['program_type'];
  major: string;
  class_code: string;
  term_name: string;
  start_date: string;
  end_date: string;
  status: EnrollmentStatus;
  instructor: string; // chỉ dùng cho ACT Academy
  evaluation: string;
}

export interface CastingDraft {
  full_name: string;
  gender: GenderType;
  dob: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  parent_guardian_name: string;

  height_cm: string;
  weight_kg: string;
  shoe_size: string;
  chest_cm: string;
  waist_cm: string;
  hip_cm: string;
  tattoos_piercings: string[];

  experience: Record<ExperienceKind, ExperienceEntry[]>;

  accents: string[];
  languages: string[];
  martial_arts: string[];
  instruments: string[];
  dancing: string[];
  sports: string[];

  willing_work_cities: string[];
  role_willingness: string[];

  headshot_url: string;
  fullbody_url: string;
  compcard_url: string;
  social_links: Required<SocialLinks>;

  trainings: TrainingEntry[];

  /** Link self-tape khi ứng tuyển một dự án cụ thể. */
  selftape_url: string;

  consent: boolean;

  /** Đồng ý hiển thị hồ sơ trên trang công khai dienvienvn.com/<username>. */
  public_profile: boolean;
}

export function createEmptyDraft(): CastingDraft {
  return {
    full_name: '',
    gender: 'female',
    dob: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    parent_guardian_name: '',
    height_cm: '',
    weight_kg: '',
    shoe_size: '',
    chest_cm: '',
    waist_cm: '',
    hip_cm: '',
    tattoos_piercings: ['none'],
    experience: { feature_films: [], web_dramas: [], tv_shows: [], commercials: [], music_videos: [] },
    accents: [],
    languages: [],
    martial_arts: [],
    instruments: [],
    dancing: [],
    sports: [],
    willing_work_cities: ['TP.HCM'],
    role_willingness: [],
    headshot_url: '',
    fullbody_url: '',
    compcard_url: '',
    social_links: { facebook: '', instagram: '', tiktok: '', showreel_url: '' },
    trainings: [],
    selftape_url: '',
    consent: false,
    public_profile: false
  };
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length === 11) digits = `0${digits.slice(2)}`;
  return digits;
}

export function isValidVnPhone(phone: string): boolean {
  return /^0\d{9}$/.test(normalizePhone(phone));
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function ageFromDob(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export type StepErrors = Record<string, string>;

/** Kiểm tra các trường bắt buộc của từng bước. Trả về map field -> thông báo lỗi. */
export function validateStep(step: number, d: CastingDraft, ctx: { selftapeRequired?: boolean | null } = {}): StepErrors {
  const e: StepErrors = {};
  if (step === 1) {
    if (d.full_name.trim().length < 2) e.full_name = 'Vui lòng nhập họ và tên';
    if (!d.dob) {
      e.dob = 'Vui lòng chọn ngày sinh';
    } else {
      const age = ageFromDob(d.dob);
      if (age === null || age < 3 || age > 90) e.dob = 'Ngày sinh không hợp lệ';
    }
    if (!d.phone.trim()) e.phone = 'Vui lòng nhập số điện thoại';
    else if (!isValidVnPhone(d.phone)) e.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0';
    if (!d.email.trim()) e.email = 'Vui lòng nhập email';
    else if (!isValidEmail(d.email)) e.email = 'Email không hợp lệ';
    if (!d.city.trim()) e.city = 'Vui lòng chọn tỉnh / thành phố';
    const age = ageFromDob(d.dob);
    if (age !== null && age < 18 && !d.parent_guardian_name.trim()) {
      e.parent_guardian_name = 'Diễn viên dưới 18 tuổi cần thông tin phụ huynh / người giám hộ';
    }
  }
  if (step === 2) {
    const h = Number(d.height_cm);
    const w = Number(d.weight_kg);
    if (!d.height_cm) e.height_cm = 'Vui lòng nhập chiều cao';
    else if (!(h >= 80 && h <= 230)) e.height_cm = 'Chiều cao từ 80 đến 230 cm';
    if (!d.weight_kg) e.weight_kg = 'Vui lòng nhập cân nặng';
    else if (!(w >= 15 && w <= 200)) e.weight_kg = 'Cân nặng từ 15 đến 200 kg';
    for (const k of ['chest_cm', 'waist_cm', 'hip_cm'] as const) {
      if (d[k] && !(Number(d[k]) >= 30 && Number(d[k]) <= 200)) e[k] = 'Số đo không hợp lệ';
    }
  }
  if (step === 6) {
    if (!d.headshot_url) e.headshot_url = 'Vui lòng tải lên ảnh chân dung';
    if (!d.fullbody_url) e.fullbody_url = 'Vui lòng tải lên ảnh toàn thân';
    const tape = (d.selftape_url || '').trim();
    if (ctx.selftapeRequired && !tape) e.selftape_url = 'Dự án này bắt buộc gửi link self-tape';
    else if (ctx.selftapeRequired !== undefined && ctx.selftapeRequired !== null && tape && !/^https?:\/\/\S+\.\S+/i.test(tape)) {
      e.selftape_url = 'Link self-tape cần bắt đầu bằng https://';
    }
  }
  if (step === 7) {
    d.trainings.forEach((t, i) => {
      if (t.school === OTHER_SCHOOL && !t.custom_school.trim()) e[`training_${i}_school`] = 'Vui lòng nhập tên cơ sở đào tạo';
      if (t.school === ACT_ACADEMY_SCHOOL && !t.class_code.trim()) e[`training_${i}_class`] = 'Vui lòng nhập mã lớp ACT';
    });
  }
  return e;
}

/**
 * Phần trăm hoàn thành hồ sơ, tính trên số trường thông tin đã điền.
 * Các phần không bắt buộc (kinh nghiệm, kỹ năng, phân cảnh, đào tạo) được tính là xong
 * khi đã có dữ liệu hoặc người điền đã đi qua bước đó (vì "chưa có" cũng là một câu trả lời).
 */
export function computeCompletion(d: CastingDraft, maxVisited: number): number {
  const filled = (v: string) => v.trim().length > 0;
  const passed = (step: number) => maxVisited > step;
  const checks: boolean[] = [
    // Bước 1
    filled(d.full_name),
    filled(d.dob),
    filled(d.phone),
    filled(d.email),
    filled(d.address),
    filled(d.city),
    // Bước 2
    filled(d.height_cm),
    filled(d.weight_kg),
    filled(d.shoe_size),
    filled(d.chest_cm),
    filled(d.waist_cm),
    filled(d.hip_cm),
    // Bước 3
    Object.values(d.experience).some(list => list.some(x => filled(x.title))) || passed(3),
    // Bước 4
    d.accents.length > 0,
    [d.languages, d.martial_arts, d.instruments, d.dancing, d.sports].some(l => l.length > 0) || passed(4),
    // Bước 5
    d.willing_work_cities.length > 0,
    d.role_willingness.length > 0 || passed(5),
    // Bước 6
    filled(d.headshot_url),
    filled(d.fullbody_url),
    filled(d.compcard_url),
    Object.values(d.social_links).some(filled),
    // Bước 7
    d.trainings.length > 0 || maxVisited >= 7
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

const RANK_ORDER: Record<string, number> = { ACT4: 4, ACT3: 3, ACT2: 2, ACT1: 1, SSC: 0.5 };

const toNum = (v: string): number | undefined => {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

function buildAcademicProfile(trainings: TrainingEntry[]): AcademicProfile {
  const enrollments: ACTCourseEnrollment[] = trainings
    .filter(t => t.school === ACT_ACADEMY_SCHOOL)
    .map(t => ({
      id: t.id,
      level: t.act_level,
      class_code: t.class_code.trim(),
      term_name: t.term_name.trim() || `Khóa ${t.class_code.trim()}`,
      start_date: t.start_date || undefined,
      end_date: t.end_date || undefined,
      status: t.status,
      instructor: t.instructor.trim() || undefined,
      evaluation: t.evaluation.trim() || undefined,
      grade: t.status === 'completed' ? 'Hoàn thành' : 'Đang học',
      certificate_issued: false
    }));

  const external_trainings: ExternalTraining[] = trainings
    .filter(t => t.school !== ACT_ACADEMY_SCHOOL)
    .map(t => {
      const isCustom = t.school === OTHER_SCHOOL;
      const known = findArtSchool(t.school);
      return {
        id: t.id,
        school_name: isCustom ? t.custom_school.trim() : t.school,
        school_group: known?.group,
        school_city: known?.city,
        program_type: t.program_type,
        major: t.major.trim() || undefined,
        class_code: t.class_code.trim() || undefined,
        term_name: t.term_name.trim() || undefined,
        start_date: t.start_date || undefined,
        end_date: t.end_date || undefined,
        status: t.status,
        evaluation: t.evaluation.trim() || undefined
      };
    });

  const highest = [...enrollments].sort((a, b) => (RANK_ORDER[b.level] || 0) - (RANK_ORDER[a.level] || 0))[0];
  const schools = external_trainings.map(t => t.school_name).filter(Boolean);

  return {
    highest_act_level: highest ? highest.level : null,
    highest_class_code: highest?.class_code,
    highest_level_status: highest?.status,
    enrollments,
    total_courses_count: enrollments.length,
    external_trainings,
    specialization_notes: [
      highest ? `Học viên ACT Academy, cấp độ cao nhất ${highest.level} (${highest.class_code})` : '',
      schools.length ? `Đào tạo tại: ${schools.join(', ')}` : ''
    ].filter(Boolean).join(' • ') || undefined
  };
}

function buildExperience(exp: CastingDraft['experience']): ActingExperience {
  const clean = (list: ExperienceEntry[]) => list.filter(x => x.title.trim());
  const yearOf = (y: string) => toNum(y);
  return {
    feature_films: clean(exp.feature_films).map(x => ({ title: x.title.trim(), role: x.role, character: x.character.trim() || undefined, year: yearOf(x.year) })),
    short_films: [],
    tv_shows: clean(exp.tv_shows).map(x => ({ title: x.title.trim(), role: x.role, character: x.character.trim() || undefined, year: yearOf(x.year) })),
    web_dramas: clean(exp.web_dramas).map(x => ({ title: x.title.trim(), role: x.role, character: x.character.trim() || undefined, year: yearOf(x.year) })),
    commercials: clean(exp.commercials).map(x => ({ brand: x.title.trim(), role: x.role, year: yearOf(x.year) })),
    music_videos: clean(exp.music_videos).map(x => ({ artist: x.character.trim(), song: x.title.trim(), role: x.role, year: yearOf(x.year) }))
  };
}

/**
 * Chuyển dữ liệu form thành bản ghi talent_profiles đúng chuẩn CRM.
 * id / created_at / review_status được server gán lại khi lưu.
 */
export function draftToTalentProfile(d: CastingDraft): Omit<TalentProfile, 'id'> {
  const phone = normalizePhone(d.phone);
  const accents = d.accents.map(a => ({ accent: a, level: 'Bản ngữ' }));
  return {
    user_id: null,
    lead_id: null,
    full_name: d.full_name.trim(),
    email: d.email.trim().toLowerCase(),
    phone,
    home_phone: '',
    gender: d.gender,
    parent_guardian_name: d.parent_guardian_name.trim() || null,
    address: d.address.trim(),
    city: d.city.trim(),
    province: d.city.trim(),
    dob: d.dob,
    height_cm: toNum(d.height_cm),
    weight_kg: toNum(d.weight_kg),
    shoe_size: d.shoe_size.trim() || undefined,
    chest_cm: toNum(d.chest_cm),
    waist_cm: toNum(d.waist_cm),
    hip_cm: toNum(d.hip_cm),
    acting_experience: buildExperience(d.experience),
    willing_work_cities: d.willing_work_cities,
    preferred_project_types: [],
    preferred_role_types: [],
    acting_genres: [],
    role_willingness: d.role_willingness,
    social_links: {
      facebook: d.social_links.facebook.trim(),
      instagram: d.social_links.instagram.trim(),
      tiktok: d.social_links.tiktok.trim(),
      showreel_url: d.social_links.showreel_url.trim()
    },
    languages: [
      { language: 'Tiếng Việt', level: 'Bản ngữ' },
      ...normalizeSkills(LANGUAGE_OPTIONS, d.languages)
        .filter(l => l.toLowerCase() !== 'tiếng việt')
        .map(l => ({ language: l, level: 'Giao tiếp' }))
    ],
    vietnamese_accents: accents,
    instruments: normalizeSkills(INSTRUMENT_OPTIONS, d.instruments).map(n => ({ name: n, level: 'Cơ bản' })),
    sports: normalizeSkills(SPORT_OPTIONS, d.sports).map(n => ({ name: n, level: 'Cơ bản' })),
    dancing: normalizeSkills(DANCE_OPTIONS, d.dancing).map(s => ({ style: s, level: 'Cơ bản' })),
    singing: { genres: [], vocal_range: [], level: '' },
    martial_arts: normalizeSkills(MARTIAL_ARTS_OPTIONS, d.martial_arts).map(s => ({ style: s, level: 'Cơ bản' })),
    transportation: [],
    tattoos_piercings: d.tattoos_piercings.length ? d.tattoos_piercings : ['none'],
    headshot_url: d.headshot_url || null,
    fullbody_url: d.fullbody_url || null,
    compcard_url: d.compcard_url || null,
    academic_profile: buildAcademicProfile(d.trainings),
    public_profile: !!d.public_profile,
    submission_source: 'dienvienvn',
    review_status: 'pending'
  };
}

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const ROLE_IDS = ['leading', 'supporting', 'cameo', 'extra'] as const;
const asRole = (r: unknown): ExperienceEntry['role'] =>
  (ROLE_IDS as readonly string[]).includes(String(r)) ? (r as ExperienceEntry['role']) : 'supporting';

/**
 * Chiều ngược của draftToTalentProfile: dựng lại dữ liệu form từ hồ sơ đã lưu
 * để diễn viên đăng nhập chỉnh sửa / bổ sung.
 */
export function talentToDraft(t: TalentProfile): CastingDraft {
  const base = createEmptyDraft();
  const exp = (t.acting_experience || {}) as Partial<ActingExperience>;
  const film = (list?: { title: string; role: unknown; character?: string; year?: number }[]): ExperienceEntry[] =>
    (list || []).map(x => ({ id: newId(), title: str(x.title), role: asRole(x.role), character: str(x.character), year: str(x.year) }));
  const academic = t.academic_profile;
  const option = (list: string[], values: (string | undefined)[]) =>
    values.filter((v): v is string => !!v && list.includes(v));

  const trainings: TrainingEntry[] = [
    ...(academic?.enrollments || []).map(e => ({
      ...blankTraining(),
      id: e.id || newId(),
      school: ACT_ACADEMY_SCHOOL,
      act_level: e.level,
      program_type: 'short_course' as ExternalTraining['program_type'],
      class_code: str(e.class_code),
      term_name: str(e.term_name),
      start_date: str(e.start_date),
      end_date: str(e.end_date),
      status: e.status,
      instructor: str(e.instructor),
      evaluation: str(e.evaluation)
    })),
    ...(academic?.external_trainings || []).map(e => {
      const known = findArtSchool(e.school_name);
      return {
        ...blankTraining(),
        id: e.id || newId(),
        school: known ? known.name : OTHER_SCHOOL,
        custom_school: known ? '' : str(e.school_name),
        program_type: e.program_type,
        major: str(e.major),
        class_code: str(e.class_code),
        term_name: str(e.term_name),
        start_date: str(e.start_date),
        end_date: str(e.end_date),
        status: e.status,
        evaluation: str(e.evaluation)
      };
    })
  ];

  return {
    ...base,
    full_name: str(t.full_name),
    gender: t.gender || base.gender,
    dob: str(t.dob).slice(0, 10),
    phone: str(t.phone),
    email: str(t.email),
    address: str(t.address),
    city: str(t.city || t.province),
    parent_guardian_name: str(t.parent_guardian_name),
    height_cm: str(t.height_cm),
    weight_kg: str(t.weight_kg),
    shoe_size: str(t.shoe_size),
    chest_cm: str(t.chest_cm),
    waist_cm: str(t.waist_cm),
    hip_cm: str(t.hip_cm),
    tattoos_piercings: t.tattoos_piercings?.length ? t.tattoos_piercings : ['none'],
    experience: {
      feature_films: film([...(exp.feature_films || []), ...(exp.short_films || [])]),
      web_dramas: film(exp.web_dramas),
      tv_shows: film(exp.tv_shows),
      commercials: (exp.commercials || []).map(x => ({ id: newId(), title: str(x.brand), role: asRole(x.role), character: '', year: str(x.year) })),
      music_videos: (exp.music_videos || []).map(x => ({ id: newId(), title: str(x.song), role: asRole(x.role), character: str(x.artist), year: str(x.year) }))
    },
    accents: option(ACCENT_OPTIONS, (t.vietnamese_accents || []).map(a => a.accent)),
    // Giữ cả mục tự thêm (ngoài danh sách có sẵn) để sửa hồ sơ không làm mất kỹ năng
    languages: normalizeSkills(LANGUAGE_OPTIONS, (t.languages || []).map(l => l.language).filter(l => l !== 'Tiếng Việt')),
    martial_arts: normalizeSkills(MARTIAL_ARTS_OPTIONS, (t.martial_arts || []).map(m => m.style || m.name)),
    instruments: normalizeSkills(INSTRUMENT_OPTIONS, (t.instruments || []).map(i => i.name || i.style)),
    dancing: normalizeSkills(DANCE_OPTIONS, (t.dancing || []).map(d => d.style || d.name)),
    sports: normalizeSkills(SPORT_OPTIONS, (t.sports || []).map(s => s.name || s.style)),
    willing_work_cities: t.willing_work_cities?.length ? t.willing_work_cities : base.willing_work_cities,
    role_willingness: t.role_willingness || [],
    headshot_url: str(t.headshot_url),
    fullbody_url: str(t.fullbody_url),
    compcard_url: str(t.compcard_url),
    social_links: {
      facebook: str(t.social_links?.facebook),
      instagram: str(t.social_links?.instagram),
      tiktok: str(t.social_links?.tiktok),
      showreel_url: str(t.social_links?.showreel_url)
    },
    trainings,
    consent: true,
    public_profile: !!t.public_profile
  };
}

function blankTraining(): TrainingEntry {
  return {
    id: newId(),
    school: ACT_ACADEMY_SCHOOL,
    custom_school: '',
    act_level: 'ACT1',
    program_type: 'university',
    major: '',
    class_code: '',
    term_name: '',
    start_date: '',
    end_date: '',
    status: 'completed',
    instructor: '',
    evaluation: ''
  };
}
