export type UserRole = 'admin' | 'staff' | 'student';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
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
  level: string; // Bản ngữ, Thành thạo, Giao tiếp, Cơ bản
}

export interface AccentItem {
  accent: string; // Bắc, Nam, Trung, Huế, Miền Tây
  level: string; // Bản ngữ, Tốt, Cơ bản
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
  dob?: string; // YYYY-MM-DD
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
  role_willingness: string[]; // hair_color, cut_hair, kissing_scene, swimsuit, lingerie, partial_nudity
  
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
  gender: string; // all, male, female, other
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
