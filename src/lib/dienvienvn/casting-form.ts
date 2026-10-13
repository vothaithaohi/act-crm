// Cấu hình & logic dùng chung cho form nộp hồ sơ casting trên dienvienvn.com.
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
export const LANGUAGE_OPTIONS = ['Tiếng Anh', 'Tiếng Hàn', 'Tiếng Trung', 'Tiếng Nhật', 'Tiếng Pháp'];
export const MARTIAL_ARTS_OPTIONS = ['Boxing', 'Vovinam', 'Taekwondo', 'Karate', 'Muay Thai', 'Võ Cổ Truyền'];
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
    consent: false
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
    languages: [{ language: 'Tiếng Việt', level: 'Bản ngữ' }, ...d.languages.map(l => ({ language: l, level: 'Giao tiếp' }))],
    vietnamese_accents: accents,
    instruments: d.instruments.map(n => ({ name: n, level: 'Cơ bản' })),
    sports: d.sports.map(n => ({ name: n, level: 'Cơ bản' })),
    dancing: d.dancing.map(s => ({ style: s, level: 'Cơ bản' })),
    singing: { genres: [], vocal_range: [], level: '' },
    martial_arts: d.martial_arts.map(s => ({ style: s, level: 'Cơ bản' })),
    transportation: [],
    tattoos_piercings: d.tattoos_piercings.length ? d.tattoos_piercings : ['none'],
    headshot_url: d.headshot_url || null,
    fullbody_url: d.fullbody_url || null,
    compcard_url: d.compcard_url || null,
    academic_profile: buildAcademicProfile(d.trainings),
    submission_source: 'dienvienvn',
    review_status: 'pending'
  };
}
