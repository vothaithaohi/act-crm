-- ==============================================================================
-- ACT ACADEMY MINI CRM - RBAC & USER PERMISSIONS MIGRATION
-- Roles: super_admin, sales, marketing, casting, developer
-- ==============================================================================

-- 1. UPDATE USER ROLE ENUM (OR ADD CHECK CONSTRAINT)
DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'marketing';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'casting';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'developer';
EXCEPTION
    WHEN others THEN null;
END $$;

-- 2. ENHANCE PROFILES TABLE
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Tuyển sinh',
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ DEFAULT now();

-- Update check constraint on profiles.role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('super_admin', 'sales', 'marketing', 'casting', 'developer', 'admin', 'staff', 'student'));

-- 3. WEBHOOK LOGS TABLE FOR DEVELOPER & MARKETING
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'meta_ads',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
    ip TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access to webhook_logs" ON public.webhook_logs;
CREATE POLICY "Public access to webhook_logs" ON public.webhook_logs
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

-- 4. INSERT DEMO TEAM MEMBERS FOR 5 ROLES
INSERT INTO public.profiles (id, role, full_name, email, phone, department, status)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'super_admin', 'Ban Giám Đốc ACT', 'admin@act.edu.vn', '0901234567', 'Ban Giám Đốc', 'active'),
    ('00000000-0000-0000-0000-000000000002', 'sales', 'Trần Thảo My (Tư Vấn)', 'sales@act.edu.vn', '0912345678', 'Phòng Tuyển Sinh', 'active'),
    ('00000000-0000-0000-0000-000000000003', 'marketing', 'Nguyễn Hoàng Long (Ads)', 'mkt@act.edu.vn', '0987654321', 'Phòng Marketing', 'active'),
    ('00000000-0000-0000-0000-000000000004', 'casting', 'Lê Hải Đăng (Casting Lead)', 'casting@act.edu.vn', '0934567890', 'Bộ Phận Tuyển Vai', 'active'),
    ('00000000-0000-0000-0000-000000000005', 'developer', 'Võ Thái Thao (Kỹ Thuật)', 'dev@act.edu.vn', '0967890123', 'Phòng Kỹ Thuật IT', 'active')
ON CONFLICT (email) DO UPDATE 
SET role = EXCLUDED.role, full_name = EXCLUDED.full_name, department = EXCLUDED.department, status = EXCLUDED.status;
