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
  | 'intake'
  | 'qualified'
  | 'contacted'
  | 'considering'
  | 'trial_in_person'
  | 'follow_up_later'
  | 'converted';

export const LEAD_STATUS_DETAILS: Record<LeadStatus, {
  label: string;
  shortLabel: string;
  badgeColor: string;
  columnColor: string;
  desc: string;
}> = {
  intake: {
    label: 'Intake (Tiếp nhận ban đầu)',
    shortLabel: 'Tiếp nhận',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    columnColor: 'border-t-blue-500 bg-blue-50/20 dark:bg-blue-950/10',
    desc: 'Lead mới đổ về hệ thống từ quảng cáo hoặc đăng ký form, chưa qua xử lý.'
  },
  qualified: {
    label: 'Qualified (Đạt tiêu chuẩn)',
    shortLabel: 'Tiềm năng',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    columnColor: 'border-t-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10',
    desc: 'Lead đã được sàng lọc thông tin cơ bản (đúng độ tuổi, khu vực, nhu cầu học thật) và đáp ứng tiêu chuẩn của học viện.'
  },
  contacted: {
    label: 'Contacted (Đã liên hệ)',
    shortLabel: 'Đã liên hệ',
    badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    columnColor: 'border-t-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10',
    desc: 'Đội ngũ tư vấn đã thực hiện gọi điện, nhắn tin hoặc gửi email tư vấn bước đầu.'
  },
  considering: {
    label: 'Considering (Đang cân nhắc)',
    shortLabel: 'Đang cân nhắc',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    columnColor: 'border-t-amber-500 bg-amber-50/20 dark:bg-amber-950/10',
    desc: 'Học viên đã nhận tư vấn/báo giá nhưng cần thêm thời gian suy nghĩ, sắp xếp lịch trình cá nhân hoặc tài chính.'
  },
  trial_in_person: {
    label: 'Trial / In Person (Học thử / Audition)',
    shortLabel: 'Học thử / Test',
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    columnColor: 'border-t-purple-500 bg-purple-50/20 dark:bg-purple-950/10',
    desc: 'Học viên đã hẹn hoặc đang tham gia buổi học thử, audition đầu vào, hoặc đến tư vấn trực tiếp tại studio.'
  },
  follow_up_later: {
    label: 'Follow up later (Chăm sóc lại sau)',
    shortLabel: 'Chăm sóc sau',
    badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    columnColor: 'border-t-slate-400 bg-slate-50/30 dark:bg-slate-900/10',
    desc: 'Học viên chưa đăng ký ngay ở thời điểm này (bận việc, chưa đủ tiền, chờ khóa sau), cần đặt lịch chăm sóc lại vào một thời điểm cụ thể.'
  },
  converted: {
    label: 'Converted (Đã nhập học)',
    shortLabel: 'Đã nhập học',
    badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    columnColor: 'border-t-rose-500 bg-rose-50/20 dark:bg-rose-950/10',
    desc: 'Học viên đã đóng học phí và chính thức nhập học thành công (sẵn sàng chuyển thành Student/Talent Profile).'
  }
};

export function normalizeLeadStatus(rawStatus?: string | null): LeadStatus {
  if (!rawStatus) return 'intake';
  const s = rawStatus.toLowerCase().trim();
  if (s === 'new') return 'intake';
  if (s === 'audition_scheduled' || s === 'audition_passed') return 'trial_in_person';
  if (s === 'enrolled') return 'converted';
  if (s === 'lost') return 'follow_up_later';
  if (['intake', 'qualified', 'contacted', 'considering', 'trial_in_person', 'follow_up_later', 'converted'].includes(s)) {
    return s as LeadStatus;
  }
  return 'intake';
}

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
  tuition_fee?: number;
  academic_profile?: AcademicProfile;
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

export interface ACTTermMaster {
  code: string;
  term_label: string;
  level: ACTCourseLevel;
  start_date: string;
  end_date: string;
  time_display: string;
  year: number;
  instructor_default?: string;
}

export const ACT_TERMS_DATABASE: ACTTermMaster[] = [
  // ACT 1 Terms
  { code: 'ACT1-26A', term_label: 'Term 26A', level: 'ACT1', start_date: '16/04/2024', end_date: '16/05/2024', time_display: 'Tháng 04/2024 - 05/2024', year: 2024, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT1-26B', term_label: 'Term 26B', level: 'ACT1', start_date: '16/04/2024', end_date: '16/05/2024', time_display: 'Tháng 04/2024 - 05/2024', year: 2024, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT1-27A', term_label: 'Term 27A', level: 'ACT1', start_date: '28/05/2024', end_date: '27/06/2024', time_display: 'Tháng 05/2024 - 06/2024', year: 2024, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT1-27B', term_label: 'Term 27B', level: 'ACT1', start_date: '28/05/2024', end_date: '27/06/2024', time_display: 'Tháng 05/2024 - 06/2024', year: 2024, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT1-28A', term_label: 'Term 28A', level: 'ACT1', start_date: '23/07/2024', end_date: '22/08/2024', time_display: 'Tháng 07/2024 - 08/2024', year: 2024, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT1-28B', term_label: 'Term 28B', level: 'ACT1', start_date: '23/07/2024', end_date: '22/08/2024', time_display: 'Tháng 07/2024 - 08/2024', year: 2024, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT1-29A', term_label: 'Term 29A', level: 'ACT1', start_date: '09/10/2024', end_date: '10/10/2024', time_display: 'Tháng 10/2024', year: 2024, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT1-30A', term_label: 'Term 30A', level: 'ACT1', start_date: '29/10/2024', end_date: '28/11/2024', time_display: 'Tháng 10/2024 - 11/2024', year: 2024, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT1-31A', term_label: 'Term 31A', level: 'ACT1', start_date: '12/10/2024', end_date: '16/01/2025', time_display: 'Tháng 10/2024 - 01/2025', year: 2024, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT1-32A', term_label: 'Term 32A', level: 'ACT1', start_date: '18/02/2025', end_date: '20/03/2025', time_display: 'Tháng 02/2025 - 03/2025', year: 2025, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT1-33A', term_label: 'Term 33A', level: 'ACT1', start_date: '08/04/2025', end_date: '13/05/2025', time_display: 'Tháng 04/2025 - 05/2025', year: 2025, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT1-34A', term_label: 'Term 34A', level: 'ACT1', start_date: '03/06/2025', end_date: '08/07/2025', time_display: 'Tháng 06/2025 - 07/2025', year: 2025, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT1-35A', term_label: 'Term 35A', level: 'ACT1', start_date: '29/07/2025', end_date: '28/08/2025', time_display: 'Tháng 07/2025 - 08/2025', year: 2025, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT1-36A', term_label: 'Term 36A', level: 'ACT1', start_date: '16/09/2025', end_date: '16/10/2025', time_display: 'Tháng 09/2025 - 10/2025', year: 2025, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT1-37B', term_label: 'Term 37B', level: 'ACT1', start_date: '04/11/2025', end_date: '04/12/2025', time_display: 'Tháng 11/2025 - 12/2025', year: 2025, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT1-38B', term_label: 'Term 38B', level: 'ACT1', start_date: '22/12/2025', end_date: '22/01/2026', time_display: 'Tháng 12/2025 - 01/2026', year: 2025, instructor_default: 'Giảng viên ACT Academy' },

  // ACT 2 Terms
  { code: 'ACT2-26A', term_label: 'Term 26A', level: 'ACT2', start_date: '17/04/2024', end_date: '17/05/2024', time_display: 'Tháng 04/2024 - 05/2024', year: 2024, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT2-28', term_label: 'Term 28', level: 'ACT2', start_date: '26/08/2024', end_date: '25/09/2024', time_display: 'Tháng 08/2024 - 09/2024', year: 2024, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT2-29', term_label: 'Term 29', level: 'ACT2', start_date: '09/09/2024', end_date: '10/09/2024', time_display: 'Tháng 09/2024', year: 2024, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT2-30', term_label: 'Term 30', level: 'ACT2', start_date: '28/10/2024', end_date: '27/11/2024', time_display: 'Tháng 10/2024 - 11/2024', year: 2024, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT2-31A', term_label: 'Term 31A', level: 'ACT2', start_date: '12/09/2024', end_date: '17/01/2025', time_display: 'Tháng 09/2024 - 01/2025', year: 2024, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT2-32A', term_label: 'Term 32A', level: 'ACT2', start_date: '17/02/2025', end_date: '19/03/2025', time_display: 'Tháng 02/2025 - 03/2025', year: 2025, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT2-33A', term_label: 'Term 33A', level: 'ACT2', start_date: '14/04/2025', end_date: '16/05/2025', time_display: 'Tháng 04/2025 - 05/2025', year: 2025, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT2-34A', term_label: 'Term 34A', level: 'ACT2', start_date: '02/06/2025', end_date: '07/07/2025', time_display: 'Tháng 06/2025 - 07/2025', year: 2025, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT2-35A', term_label: 'Term 35A', level: 'ACT2', start_date: '29/07/2025', end_date: '01/09/2025', time_display: 'Tháng 07/2025 - 09/2025', year: 2025, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT2-36B', term_label: 'Term 36B', level: 'ACT2', start_date: '16/09/2025', end_date: '16/10/2025', time_display: 'Tháng 09/2025 - 10/2025', year: 2025, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT2-37', term_label: 'Term 37', level: 'ACT2', start_date: '04/11/2025', end_date: '04/12/2025', time_display: 'Tháng 11/2025 - 12/2025', year: 2025, instructor_default: 'Giảng viên ACT Academy' },
  { code: 'ACT2-38B', term_label: 'Term 38B', level: 'ACT2', start_date: '30/12/2025', end_date: '29/01/2026', time_display: 'Tháng 12/2025 - 01/2026', year: 2025, instructor_default: 'Giảng viên ACT Academy' },

  // ACT 3 Terms
  { code: 'ACT3-26', term_label: 'Term 26', level: 'ACT3', start_date: '16/04/2024', end_date: '16/05/2024', time_display: 'Tháng 04/2024 - 05/2024', year: 2024, instructor_default: 'Đạo diễn Vũ Trần & GV ACT' },
  { code: 'ACT3-27', term_label: 'Term 27', level: 'ACT3', start_date: '28/05/2024', end_date: '27/06/2024', time_display: 'Tháng 05/2024 - 06/2024', year: 2024, instructor_default: 'Đạo diễn Vũ Trần & GV ACT' },
  { code: 'ACT3-29', term_label: 'Term 29', level: 'ACT3', start_date: '09/10/2024', end_date: '10/10/2024', time_display: 'Tháng 10/2024', year: 2024, instructor_default: 'Đạo diễn Vũ Trần & GV ACT' },
  { code: 'ACT3-31', term_label: 'Term 31', level: 'ACT3', start_date: '12/09/2024', end_date: '17/01/2025', time_display: 'Tháng 09/2024 - 01/2025', year: 2024, instructor_default: 'Đạo diễn Vũ Trần & GV ACT' },
  { code: 'ACT3-32', term_label: 'Term 32', level: 'ACT3', start_date: '18/02/2025', end_date: '20/03/2025', time_display: 'Tháng 02/2025 - 03/2025', year: 2025, instructor_default: 'Đạo diễn Vũ Trần & GV ACT' },
  { code: 'ACT3-33', term_label: 'Term 33', level: 'ACT3', start_date: '08/04/2025', end_date: '15/05/2025', time_display: 'Tháng 04/2025 - 05/2025', year: 2025, instructor_default: 'Đạo diễn Vũ Trần & GV ACT' },
  { code: 'ACT3-36', term_label: 'Term 36', level: 'ACT3', start_date: '16/09/2025', end_date: '16/10/2025', time_display: 'Tháng 09/2025 - 10/2025', year: 2025, instructor_default: 'Đạo diễn Vũ Trần & GV ACT' },
  { code: 'ACT3-37', term_label: 'Term 37', level: 'ACT3', start_date: '03/11/2025', end_date: '03/12/2025', time_display: 'Tháng 11/2025 - 12/2025', year: 2025, instructor_default: 'Đạo diễn Vũ Trần & GV ACT' },
  { code: 'ACT3-38', term_label: 'Term 38', level: 'ACT3', start_date: '22/12/2025', end_date: '21/01/2026', time_display: 'Tháng 12/2025 - 01/2026', year: 2025, instructor_default: 'Đạo diễn Vũ Trần & GV ACT' },

  // ACT 4 Terms
  { code: 'ACT4-30', term_label: 'Term 30', level: 'ACT4', start_date: '28/10/2024', end_date: '27/11/2024', time_display: 'Tháng 10/2024 - 11/2024', year: 2024, instructor_default: 'Đạo diễn Vũ Trần & Hội đồng ACT' },
  { code: 'ACT4-35', term_label: 'Term 35', level: 'ACT4', start_date: '28/07/2025', end_date: '27/08/2025', time_display: 'Tháng 07/2025 - 08/2025', year: 2025, instructor_default: 'Đạo diễn Vũ Trần & Hội đồng ACT' },

  // SSC Terms
  { code: 'SSC-35', term_label: 'Term 35', level: 'SSC', start_date: '04/08/2025', end_date: '10/09/2025', time_display: 'Tháng 08/2025 - 09/2025', year: 2025, instructor_default: 'Giảng viên Chuyên đề ACT' }
];

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
  singingStyles: string[];
  roleWillingness: string[];
  cities: string[];
  genres: string[];
  tattoos?: 'all' | 'none' | 'has_tattoo';
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
