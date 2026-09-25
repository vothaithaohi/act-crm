export type UserRole = 'super_admin' | 'sales' | 'marketing' | 'casting' | 'developer';

export type Permission = 
  | 'leads:read'
  | 'leads:write'
  | 'leads:delete'
  | 'leads:convert'
  | 'leads:export'
  | 'talents:read'
  | 'talents:write'
  | 'talents:delete'
  | 'talents:export'
  | 'users:manage'
  | 'webhooks:manage'
  | 'system:settings';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'leads:read', 'leads:write', 'leads:delete', 'leads:convert', 'leads:export',
    'talents:read', 'talents:write', 'talents:delete', 'talents:export',
    'users:manage', 'webhooks:manage', 'system:settings'
  ],
  sales: [
    'leads:read', 'leads:write', 'leads:convert',
    'talents:read'
  ],
  marketing: [
    'leads:read', 'leads:write',
    'talents:read',
    'webhooks:manage'
  ],
  casting: [
    'talents:read', 'talents:write', 'talents:export',
    'leads:read'
  ],
  developer: [
    'webhooks:manage', 'system:settings',
    'leads:read', 'talents:read'
  ]
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export const ROLE_DETAILS: Record<UserRole, { label: string; badge: string; desc: string }> = {
  super_admin: {
    label: 'Super Admin',
    badge: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300',
    desc: 'Toàn quyền kiểm soát, quản lý tài khoản & phân quyền'
  },
  sales: {
    label: 'Tư Vấn Tuyển Sinh (Sales)',
    badge: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300',
    desc: 'Chăm sóc phễu lead, gọi điện, xếp lịch audition, chốt nhập học'
  },
  marketing: {
    label: 'Marketing & Ads',
    badge: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300',
    desc: 'Giám sát Meta Ads, tối ưu CPL và chất lượng nguồn lead'
  },
  casting: {
    label: 'Casting Director',
    badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300',
    desc: 'Tuyển vai diễn viên, lọc hồ sơ, xuất comp-card gửi NSX'
  },
  developer: {
    label: 'Developer / IT',
    badge: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
    desc: 'Kỹ thuật hệ thống, cấu hình Webhook, API Meta & Supabase'
  }
};

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  department?: string;
  password?: string;
  status: 'active' | 'inactive';
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export type LeadSource = 'meta_ads' | 'manual' | 'website_form' | 'referral';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'audition_scheduled'
  | 'audition_passed'
  | 'enrolled'
  | 'lost';

export interface Lead {
  id: string;
  full_name: string;
  email?: string;
  phone: string;
  source: LeadSource;
  meta_lead_id?: string;
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
  course_interest?: string;
  notes?: string;
  status: LeadStatus;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export type GenderType = 'male' | 'female' | 'other';

export interface FilmRole {
  title: string;
  role: 'leading' | 'supporting' | 'cameo' | 'extra';
  character?: string;
  year?: number;
  director?: string;
}

export interface CommercialRole {
  brand: string;
  role: 'leading' | 'supporting' | 'cameo' | 'extra';
  year?: number;
}

export interface MusicVideoRole {
  artist: string;
  song: string;
  role: 'leading' | 'supporting' | 'cameo' | 'extra';
  year?: number;
}

export interface ActingExperience {
  feature_films: FilmRole[];
  short_films: FilmRole[];
  tv_shows: FilmRole[];
  web_dramas: FilmRole[];
  commercials: CommercialRole[];
  music_videos: MusicVideoRole[];
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  showreel_url?: string;
}

export interface LanguageItem {
  language: string;
  level: string;
}

export interface AccentItem {
  accent: string;
  level: string;
}

export interface SkillItem {
  name?: string;
  style?: string;
  level: string;
}

export interface SingingSkill {
  genres: string[];
  vocal_range: string[];
  level: string;
}

export interface TalentProfile {
  id: string;
  user_id?: string | null;
  lead_id?: string | null;
  full_name: string;
  email: string;
  phone: string;
  home_phone?: string;
  gender: GenderType;
  parent_guardian_name?: string | null;
  address?: string;
  city?: string;
  province?: string;
  dob?: string;
  height_cm?: number;
  weight_kg?: number;
  shoe_size?: string;
  chest_cm?: number;
  waist_cm?: number;
  hip_cm?: number;
  
  acting_experience: ActingExperience;
  willing_work_cities: string[];
  preferred_project_types: string[];
  preferred_role_types: string[];
  acting_genres: string[];
  role_willingness: string[];
  
  social_links: SocialLinks;
  languages: LanguageItem[];
  vietnamese_accents: AccentItem[];
  instruments: SkillItem[];
  sports: SkillItem[];
  dancing: SkillItem[];
  singing: SingingSkill;
  martial_arts: SkillItem[];
  transportation: string[];
  tattoos_piercings: string[];
  
  headshot_url?: string | null;
  fullbody_url?: string | null;
  compcard_url?: string | null;
  
  academic_profile?: AcademicProfile;
  
  created_at?: string;
  updated_at?: string;
}

export type ACTCourseLevel = 'ACT1' | 'ACT2' | 'ACT3' | 'ACT4' | 'SSC';

export type EnrollmentStatus = 'completed' | 'studying' | 'reserved' | 'cancelled';

export interface ACTCourseEnrollment {
  id: string;
  level: ACTCourseLevel;
  class_code: string;
  term_name: string;
  start_date?: string;
  end_date?: string;
  status: EnrollmentStatus;
  instructor?: string;
  evaluation?: string;
  grade?: string;
  certificate_issued?: boolean;
}

export interface AcademicProfile {
  highest_act_level: ACTCourseLevel | null;
  highest_class_code?: string;
  highest_level_status?: EnrollmentStatus;
  enrollments: ACTCourseEnrollment[];
  total_courses_count: number;
  specialization_notes?: string;
}

export const ACT_LEVEL_DETAILS: Record<ACTCourseLevel, {
  label: string;
  shortLabel: string;
  fullName: string;
  stage: string;
  color: string;
  badgeClass: string;
  rank: number;
  description: string;
}> = {
  ACT1: {
    label: 'ACT 1',
    shortLabel: 'ACT1',
    fullName: 'Diễn Xuất Căn Bản & Giải Phóng Hình Thể / Giọng Nói',
    stage: 'Nền tảng căn bản',
    color: 'amber',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    rank: 1,
    description: 'Rèn luyện sự tự tin, giải phóng rào cản tâm lý, làm chủ giọng nói và hình thể trước đám đông.'
  },
  ACT2: {
    label: 'ACT 2',
    shortLabel: 'ACT2',
    fullName: 'Kỹ Thuật Biểu Cảm & Phân Tích Tâm Lý Nhân Vật',
    stage: 'Trung cấp diễn xuất',
    color: 'blue',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    rank: 2,
    description: 'Xây dựng tiểu sử nhân vật, phân tích kịch bản sâu sắc, kỹ thuật biểu cảm vi mô và kiểm soát nhịp cảm xúc.'
  },
  ACT3: {
    label: 'ACT 3',
    shortLabel: 'ACT3',
    fullName: 'Diễn Xuất Trước Ống Kính (Camera Acting) & Độc Thoại',
    stage: 'Nâng cao chuyên đề',
    color: 'emerald',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    rank: 3,
    description: 'Thực chiến trước ống kính máy quay 4K, cỡ cảnh (toàn/trung/cận), bắt điểm sáng, nhả thoại micro và casting role.'
  },
  ACT4: {
    label: 'ACT 4',
    shortLabel: 'ACT4',
    fullName: 'Diễn Xuất Điện Ảnh Chuyên Nghiệp & Đồ Án Tốt Nghiệp',
    stage: 'Masterclass Tốt nghiệp',
    color: 'purple',
    badgeClass: 'bg-gradient-to-r from-purple-100 to-rose-100 text-purple-900 border-purple-300 dark:from-purple-950/80 dark:to-rose-950/80 dark:text-purple-200 dark:border-purple-700 font-bold',
    rank: 4,
    description: 'Sản xuất phim ngắn tốt nghiệp, thực hành chỉ đạo diễn xuất cùng các đạo diễn danh tiếng, bảo vệ đồ án.'
  },
  SSC: {
    label: 'SSC',
    shortLabel: 'SSC',
    fullName: 'Khóa Bổ Trợ Kỹ Năng Diễn Xuất Đặc Biệt',
    stage: 'Kỹ năng đặc biệt',
    color: 'slate',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    rank: 0.5,
    description: 'Khóa chuyên đề ngắn hạn, luyện giọng lồng tiếng, diễn xuất hình thể hoặc kỹ thuật audition tuyển vai.'
  }
};

export interface CastingFilterCriteria {
  searchQuery: string;
  gender: string;
  actLevels?: string[];
  minAge?: number;
  maxAge?: number;
  minHeight?: number;
  maxHeight?: number;
  minWeight?: number;
  maxWeight?: number;
  accents: string[];
  languages: string[];
  instruments: string[];
  martialArts: string[];
  danceStyles: string[];
  sports: string[];
  roleWillingness: string[];
  cities: string[];
  genres: string[];
}

export interface WebhookLog {
  id: string;
  event: string;
  source: string;
  payload: any;
  status: 'success' | 'failed';
  ip?: string;
  created_at: string;
}
