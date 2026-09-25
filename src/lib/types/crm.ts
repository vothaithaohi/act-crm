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
  
  created_at?: string;
  updated_at?: string;
}

export interface CastingFilterCriteria {
  searchQuery: string;
  gender: string;
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
