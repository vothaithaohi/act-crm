// Dữ liệu cho link shortlist gửi đối tác (link NSX) và cổng đối tác: chỉ hồ sơ ĐÃ DUYỆT, chỉ ứng viên ACT đã chọn
// (Shortlist / Đã gửi NSX). Mọi phần bị ẩn đều được loại bỏ ngay trên máy chủ.
//  - 'public' (chưa đăng nhập): ảnh, tên ẩn một phần ("Nguyễn T. A."), self-tape, chiều cao, cân nặng, kinh nghiệm,
//    kỹ năng & ngôn ngữ, định hướng & sẵn sàng. KHÔNG có năm sinh / tuổi, số đo 3 vòng, liên hệ — bấm "Liên hệ" để
//    đăng ký tài khoản đối tác.
//  - 'partner' (đối tác đã được DienVienVN duyệt, đang đăng nhập): như trên + tên đầy đủ, SĐT, email, tuổi,
//    số đo 3 vòng, size giày. Vẫn không có ngày sinh đầy đủ, nơi ở, mạng xã hội, lời nhắn.
//  - 'full': chỉ dùng cho chế độ demo trên máy (không có máy chủ).
import { TalentProfile, getReviewStatus } from '@/lib/types/crm';
import { CastingProject, ProjectApplication } from './types';

export type ProducerTalent = Pick<
  TalentProfile,
  | 'id'
  | 'full_name'
  | 'gender'
  | 'dob'
  | 'city'
  | 'height_cm'
  | 'weight_kg'
  | 'shoe_size'
  | 'chest_cm'
  | 'waist_cm'
  | 'hip_cm'
  | 'acting_experience'
  | 'willing_work_cities'
  | 'role_willingness'
  | 'social_links'
  | 'languages'
  | 'vietnamese_accents'
  | 'instruments'
  | 'sports'
  | 'dancing'
  | 'martial_arts'
  | 'tattoos_piercings'
  | 'headshot_url'
  | 'fullbody_url'
  | 'compcard_url'
  | 'academic_profile'
> & { phone: string | null; email: string | null; age?: number | null };

export type ProducerLevel = 'public' | 'partner' | 'full';

/** Danh sách link chỉ gồm ứng viên ACT đã chọn. */
export const SHORTLIST_STATUSES: ProjectApplication['status'][] = ['shortlisted', 'sent'];

/** "Nguyễn Thị Anh" → "Nguyễn T. A."; tên một chữ "Linh" → "L." */
export function maskName(full: string): string {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Ứng viên';
  if (parts.length === 1) return `${Array.from(parts[0])[0].toUpperCase()}.`;
  return [parts[0], ...parts.slice(1).map(p => `${Array.from(p)[0].toUpperCase()}.`)].join(' ');
}

function ageOf(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
  return a >= 0 && a < 120 ? a : null;
}

export interface ProducerApplicant {
  application: Pick<ProjectApplication, 'id' | 'role_id' | 'selftape_url' | 'note' | 'created_at'>;
  talent: ProducerTalent;
}

export interface ProducerView {
  project: Pick<
    CastingProject,
    'code' | 'title' | 'production_company' | 'project_type' | 'location' | 'shooting_time' | 'deadline' | 'roles' | 'description' | 'hide_contacts'
  >;
  applicants: ProducerApplicant[];
  /** true: bản rút gọn (chưa đăng nhập đối tác). */
  limited?: boolean;
}

/** Bỏ mọi thông tin nhận diện / liên hệ; 'public' bỏ thêm tuổi và số đo 3 vòng. */
function restrictTalent(t: ProducerTalent, level: 'public' | 'partner'): ProducerTalent {
  const pub = level === 'public';
  const base = {
    ...t,
    full_name: pub ? maskName(t.full_name) : t.full_name,
    age: pub ? null : ageOf(t.dob),
    dob: null,
    city: null,
    shoe_size: pub ? null : t.shoe_size,
    chest_cm: pub ? null : t.chest_cm,
    waist_cm: pub ? null : t.waist_cm,
    hip_cm: pub ? null : t.hip_cm,
    social_links: {},
    tattoos_piercings: [],
    phone: pub ? null : t.phone,
    email: pub ? null : t.email
  };
  return base as unknown as ProducerTalent;
}

export function toProducerTalent(t: TalentProfile, hideContacts: boolean, level: ProducerLevel = 'full'): ProducerTalent {
  const full: ProducerTalent = {
    id: t.id,
    full_name: t.full_name,
    gender: t.gender,
    dob: t.dob,
    city: t.city,
    height_cm: t.height_cm,
    weight_kg: t.weight_kg,
    shoe_size: t.shoe_size,
    chest_cm: t.chest_cm,
    waist_cm: t.waist_cm,
    hip_cm: t.hip_cm,
    acting_experience: t.acting_experience,
    willing_work_cities: t.willing_work_cities,
    role_willingness: t.role_willingness,
    social_links: t.social_links,
    languages: t.languages,
    vietnamese_accents: t.vietnamese_accents,
    instruments: t.instruments,
    sports: t.sports,
    dancing: t.dancing,
    martial_arts: t.martial_arts,
    tattoos_piercings: t.tattoos_piercings,
    headshot_url: t.headshot_url,
    fullbody_url: t.fullbody_url,
    compcard_url: t.compcard_url,
    academic_profile: t.academic_profile,
    // Đối tác đã duyệt luôn thấy liên hệ; "Ẩn liên hệ" của dự án chỉ còn áp dụng cho bản demo
    phone: level === 'full' && hideContacts ? null : t.phone,
    email: level === 'full' && hideContacts ? null : t.email || null
  };
  return level === 'full' ? { ...full, age: ageOf(t.dob) } : restrictTalent(full, level);
}

export function buildProducerView(
  project: CastingProject,
  applications: ProjectApplication[],
  talents: TalentProfile[],
  level: ProducerLevel = 'partner'
): ProducerView {
  const byId = new Map(talents.map(t => [t.id, t]));
  const applicants: ProducerApplicant[] = applications
    .filter(a => a.project_id === project.id && SHORTLIST_STATUSES.includes(a.status))
    .map(a => ({ a, t: byId.get(a.talent_id) }))
    .filter((x): x is { a: ProjectApplication; t: TalentProfile } => !!x.t && getReviewStatus(x.t) === 'approved')
    .map(({ a, t }) => ({
      application: {
        id: a.id,
        role_id: a.role_id,
        selftape_url: a.selftape_url,
        // Lời nhắn của diễn viên có thể chứa SĐT / tên → chỉ bản demo mới có
        note: level === 'full' ? a.note : null,
        created_at: a.created_at
      },
      talent: toProducerTalent(t, project.hide_contacts, level)
    }));
  return {
    project: {
      code: project.code,
      title: project.title,
      production_company: project.production_company,
      project_type: project.project_type,
      location: project.location,
      shooting_time: project.shooting_time,
      deadline: project.deadline,
      roles: project.roles || [],
      description: project.description,
      hide_contacts: project.hide_contacts
    },
    applicants,
    limited: level === 'public'
  };
}
