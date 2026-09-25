-- ==============================================================================
-- ACT ACADEMY MINI CRM - SUPABASE POSTGRESQL SCHEMA MIGRATION (CLEAN & IDEMPOTENT)
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

-- 3. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    acting_experience JSONB DEFAULT '{
        "feature_films": [],
        "short_films": [],
        "tv_shows": [],
        "web_dramas": [],
        "commercials": [],
        "music_videos": []
    }'::jsonb,
    willing_work_cities TEXT[] DEFAULT ARRAY['TP.HCM'],
    preferred_project_types TEXT[] DEFAULT ARRAY['feature_film', 'web_drama'],
    preferred_role_types TEXT[] DEFAULT ARRAY['leading', 'supporting'],
    acting_genres TEXT[] DEFAULT ARRAY['drama'],
    role_willingness TEXT[] DEFAULT ARRAY[]::TEXT[],
    social_links JSONB DEFAULT '{
        "facebook": "",
        "instagram": "",
        "tiktok": "",
        "showreel_url": ""
    }'::jsonb,
    languages JSONB DEFAULT '[]'::jsonb,
    vietnamese_accents JSONB DEFAULT '[]'::jsonb,
    instruments JSONB DEFAULT '[]'::jsonb,
    sports JSONB DEFAULT '[]'::jsonb,
    dancing JSONB DEFAULT '[]'::jsonb,
    singing JSONB DEFAULT '{ "genres": [], "vocal_range": [], "level": "" }'::jsonb,
    martial_arts JSONB DEFAULT '[]'::jsonb,
    transportation TEXT[] DEFAULT ARRAY['motorbike'],
    tattoos_piercings TEXT[] DEFAULT ARRAY['none'],
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

-- Allow anon and authenticated full read/write for CRM operations
DROP POLICY IF EXISTS "Public and auth access to profiles" ON public.profiles;
CREATE POLICY "Public and auth access to profiles" ON public.profiles
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public and auth access to leads" ON public.leads;
CREATE POLICY "Public and auth access to leads" ON public.leads
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public and auth access to talent_profiles" ON public.talent_profiles;
CREATE POLICY "Public and auth access to talent_profiles" ON public.talent_profiles
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

-- 8. STORAGE BUCKET FOR TALENT MEDIA
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('talent-media', 'talent-media', true)
    ON CONFLICT (id) DO NOTHING;
EXCEPTION
    WHEN others THEN null;
END $$;
