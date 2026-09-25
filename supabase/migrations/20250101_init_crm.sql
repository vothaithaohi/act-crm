-- ==============================================================================
-- ACT ACADEMY MINI CRM - SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Academy Growth (Tuyển sinh & Bán hàng) & Casting Matching (Talent Pool & Tuyển vai)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'staff', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_source AS ENUM ('meta_ads', 'manual', 'website_form', 'referral');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM (
        'new',
        'contacted',
        'audition_scheduled',
        'audition_passed',
        'enrolled',
        'lost'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Kế thừa từ auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff', 'student')),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. LEADS TABLE (Quản trị Tuyển sinh & Meta Ads)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('meta_ads', 'manual', 'website_form', 'referral')),
    meta_lead_id TEXT,
    campaign_name TEXT,
    adset_name TEXT,
    ad_name TEXT,
    course_interest TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'audition_scheduled', 'audition_passed', 'enrolled', 'lost')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TALENT_PROFILES TABLE (Hồ sơ Casting Diễn viên Chuyên sâu)
CREATE TABLE IF NOT EXISTS public.talent_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    home_phone TEXT,
    gender TEXT NOT NULL DEFAULT 'male' CHECK (gender IN ('male', 'female', 'other')),
    parent_guardian_name TEXT,
    address TEXT,
    city TEXT DEFAULT 'TP.HCM',
    province TEXT,
    dob DATE,
    height_cm NUMERIC,
    weight_kg NUMERIC,
    shoe_size TEXT,
    chest_cm NUMERIC,
    waist_cm NUMERIC,
    hip_cm NUMERIC,
    
    -- Kinh nghiệm diễn xuất dạng JSONB
    acting_experience JSONB DEFAULT '{
        "feature_films": [],
        "short_films": [],
        "tv_shows": [],
        "web_dramas": [],
        "commercials": [],
        "music_videos": []
    }'::jsonb,
    
    -- Địa bàn hoạt động & Định hướng vai diễn
    willing_work_cities TEXT[] DEFAULT ARRAY['TP.HCM'],
    preferred_project_types TEXT[] DEFAULT ARRAY['feature_film', 'web_drama'],
    preferred_role_types TEXT[] DEFAULT ARRAY['leading', 'supporting'],
    acting_genres TEXT[] DEFAULT ARRAY['drama'],
    role_willingness TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Mạng xã hội & Showreel
    social_links JSONB DEFAULT '{
        "facebook": "",
        "instagram": "",
        "tiktok": "",
        "showreel_url": ""
    }'::jsonb,
    
    -- Kỹ năng, Ngôn ngữ & Vùng miền
    languages JSONB DEFAULT '[]'::jsonb,
    vietnamese_accents JSONB DEFAULT '[]'::jsonb,
    instruments JSONB DEFAULT '[]'::jsonb,
    sports JSONB DEFAULT '[]'::jsonb,
    dancing JSONB DEFAULT '[]'::jsonb,
    singing JSONB DEFAULT '{ "genres": [], "vocal_range": [], "level": "" }'::jsonb,
    martial_arts JSONB DEFAULT '[]'::jsonb,
    transportation TEXT[] DEFAULT ARRAY['motorbike'],
    tattoos_piercings TEXT[] DEFAULT ARRAY['none'],
    
    -- Media URLs
    headshot_url TEXT,
    fullbody_url TEXT,
    compcard_url TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_leads_updated_at ON public.leads;
CREATE TRIGGER set_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_talent_profiles_updated_at ON public.talent_profiles;
CREATE TRIGGER set_talent_profiles_updated_at
    BEFORE UPDATE ON public.talent_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check role of current user
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles Policies
DROP POLICY IF EXISTS "Admins and Staff can view all profiles" ON public.profiles;
CREATE POLICY "Admins and Staff can view all profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'staff') OR id = auth.uid());

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (public.get_current_user_role() = 'admin' OR id = auth.uid());

-- Leads Policies
DROP POLICY IF EXISTS "Staff and Admin full access on leads" ON public.leads;
CREATE POLICY "Staff and Admin full access on leads" ON public.leads
    FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Service role & webhook insert on leads" ON public.leads;
CREATE POLICY "Service role & webhook insert on leads" ON public.leads
    FOR INSERT TO anon, service_role
    WITH CHECK (true);

-- Talent Profiles Policies
DROP POLICY IF EXISTS "Staff and Admin full access on talent_profiles" ON public.talent_profiles;
CREATE POLICY "Staff and Admin full access on talent_profiles" ON public.talent_profiles
    FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Talents can view and edit own profile" ON public.talent_profiles;
CREATE POLICY "Talents can view and edit own profile" ON public.talent_profiles
    FOR ALL TO authenticated
    USING (user_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'staff'));

-- 8. STORAGE BUCKET FOR TALENT MEDIA
INSERT INTO storage.buckets (id, name, public)
VALUES ('talent-media', 'talent-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Public can view talent-media" ON storage.objects;
CREATE POLICY "Public can view talent-media" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'talent-media');

DROP POLICY IF EXISTS "Authenticated users can upload to talent-media" ON storage.objects;
CREATE POLICY "Authenticated users can upload to talent-media" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'talent-media');

DROP POLICY IF EXISTS "Authenticated users can update/delete talent-media" ON storage.objects;
CREATE POLICY "Authenticated users can update/delete talent-media" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'talent-media');
