-- ==============================================================================
-- ACT ACADEMY MINI CRM - MASTER DATABASE SCHEMA (POSTGRESQL / SUPABASE)
-- Architecture: Next.js + Supabase + Anthropic Claude + Vercel
-- ==============================================================================

-- 0. KÍCH HOẠT EXTENSION
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BẢNG PROFILES (Người dùng hệ thống: Ban Giám Đốc, Sales, Marketing, Casting, IT)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN (
    'super_admin', 'admin', 'sales', 'marketing', 'casting', 'developer', 'staff', 'student'
  )),
  department TEXT DEFAULT 'Tuyển sinh',
  phone TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  last_login TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. BẢNG LEADS (Phục vụ Tuyển sinh & Meta Ads Webhook)
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'meta_ads' CHECK (source IN ('meta_ads', 'manual', 'website_form', 'referral')),
  meta_lead_id TEXT UNIQUE,
  campaign_name TEXT,
  adset_name TEXT,
  ad_name TEXT,
  course_interest TEXT,
  notes JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'contacted', 'audition_scheduled', 'audition_passed', 'enrolled', 'lost'
  )),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tuition_fee NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. BẢNG TALENT_PROFILES (Hồ sơ Casting chi tiết theo chuẩn Casting Form)
CREATE TABLE IF NOT EXISTS public.talent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  
  -- Thông tin cơ bản
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  home_phone TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  parent_guardian_name TEXT, -- Nếu dưới 18 tuổi
  address TEXT,
  city TEXT DEFAULT 'TP.HCM',
  province TEXT,
  
  -- Chỉ số nhân trắc & hình thể
  dob DATE,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  shoe_size TEXT,
  chest_cm NUMERIC,
  waist_cm NUMERIC,
  hip_cm NUMERIC,
  
  -- Kinh nghiệm diễn xuất (Lưu dưới dạng JSONB cây thư mục)
  -- Schema: { feature_films: [], short_films: [], tv_shows: [], web_dramas: [], commercials: [], music_videos: [] }
  acting_experience JSONB DEFAULT '{
    "feature_films": [],
    "short_films": [],
    "tv_shows": [],
    "web_dramas": [],
    "commercials": [],
    "music_videos": []
  }'::jsonb,
  
  -- Nguyện vọng & Định hướng casting
  willing_work_cities TEXT[] DEFAULT ARRAY['TP.HCM']::TEXT[],
  preferred_project_types TEXT[] DEFAULT ARRAY['feature_film', 'web_drama']::TEXT[],
  preferred_role_types TEXT[] DEFAULT ARRAY['leading', 'supporting']::TEXT[],
  acting_genres TEXT[] DEFAULT ARRAY['drama']::TEXT[],
  role_willingness TEXT[] DEFAULT ARRAY[]::TEXT[], -- kissing_scene, swimsuit, lingerie, partial_nudity, hair_color, cut_hair
  
  -- Mạng xã hội & Showreel
  social_links JSONB DEFAULT '{
    "facebook": "",
    "instagram": "",
    "tiktok": "",
    "showreel_url": ""
  }'::jsonb,
  
  -- Kỹ năng biểu diễn & Ngôn ngữ
  languages JSONB DEFAULT '[]'::jsonb,
  vietnamese_accents JSONB DEFAULT '[]'::jsonb,
  instruments JSONB DEFAULT '[]'::jsonb,
  sports JSONB DEFAULT '[]'::jsonb,
  dancing JSONB DEFAULT '[]'::jsonb,
  singing JSONB DEFAULT '{ "genres": [], "vocal_range": [], "level": "" }'::jsonb,
  martial_arts JSONB DEFAULT '[]'::jsonb,
  transportation TEXT[] DEFAULT ARRAY['motorbike']::TEXT[],
  tattoos_piercings TEXT[] DEFAULT ARRAY['none']::TEXT[],
  
  -- Ảnh định danh & Compcard
  headshot_url TEXT,
  fullbody_url TEXT,
  compcard_url TEXT,
  
  -- Hồ sơ học tập ACT & Tiến trình các Term
  academic_profile JSONB DEFAULT '{
    "highest_act_level": "ACT1",
    "highest_class_code": "ACT1",
    "highest_level_status": "completed",
    "enrollments": [],
    "total_courses_count": 1
  }'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. BẢNG WEBHOOK_LOGS (Giám sát Meta Ads & Third-party Webhooks)
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'meta_ads',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. CHỈ MỤC TỐI ƯU HIỆU NĂNG (INDEXES)
CREATE INDEX IF NOT EXISTS idx_leads_meta_lead_id ON public.leads(meta_lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);

CREATE INDEX IF NOT EXISTS idx_talent_gender ON public.talent_profiles(gender);
CREATE INDEX IF NOT EXISTS idx_talent_height ON public.talent_profiles(height_cm);
CREATE INDEX IF NOT EXISTS idx_talent_dob ON public.talent_profiles(dob);
CREATE INDEX IF NOT EXISTS idx_talent_lead_id ON public.talent_profiles(lead_id);
CREATE INDEX IF NOT EXISTS idx_talent_created_at ON public.talent_profiles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);

-- 6. TRIGGER TỰ ĐỘNG CẬP NHẬT UPDATED_AT
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_talent_profiles_updated_at ON public.talent_profiles;
CREATE TRIGGER trg_talent_profiles_updated_at
  BEFORE UPDATE ON public.talent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access to profiles" ON public.profiles;
CREATE POLICY "Public access to profiles" ON public.profiles
  FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to leads" ON public.leads;
CREATE POLICY "Public access to leads" ON public.leads
  FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to talent_profiles" ON public.talent_profiles;
CREATE POLICY "Public access to talent_profiles" ON public.talent_profiles
  FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to webhook_logs" ON public.webhook_logs;
CREATE POLICY "Public access to webhook_logs" ON public.webhook_logs
  FOR ALL TO public USING (true) WITH CHECK (true);

-- 8. STORAGE BUCKET CHO TALENT MEDIA
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('talent-media', 'talent-media', true)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN others THEN null;
END $$;
