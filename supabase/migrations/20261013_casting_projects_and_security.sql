-- ==============================================================================
-- DIENVIENVN — DỰ ÁN CASTING + KHOÁ QUYỀN TRUY CẬP DATABASE
-- Chạy SAU file 20261012_dienvienvn_submissions.sql, trong Supabase SQL Editor.
--
-- Sau khi chạy:
--   • Khách vãng lai (anon key nằm trong trang web) KHÔNG đọc/ghi được bảng nào.
--   • Chỉ nhân sự đăng nhập Supabase Auth VÀ có dòng active trong bảng profiles
--     (khớp email) mới đọc/ghi dữ liệu CRM.
--   • Trang công khai dienvienvn.com và link NSX đi qua API server dùng service role key.
-- ==============================================================================

-- 0. CHUẨN HOÁ BẢNG PROFILES (database chỉ chạy init_crm, chưa chạy rbac_system) ---
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Tuyển sinh',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'sales', 'marketing', 'casting', 'developer', 'admin', 'staff', 'student'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'inactive'));

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'meta_ads',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1. BẢNG DỰ ÁN CASTING ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.casting_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,                         -- Mã dự án, VD: DV-01
  title TEXT NOT NULL,                               -- Tên thật dự án / tên phim
  hide_title BOOLEAN NOT NULL DEFAULT true,          -- Ẩn tên thật trên trang công khai (hiện mã dự án)
  production_company TEXT,
  project_type TEXT NOT NULL DEFAULT 'feature_film',
  description TEXT,
  location TEXT,
  shooting_time TEXT,
  compensation TEXT,
  deadline DATE,
  roles JSONB NOT NULL DEFAULT '[]'::jsonb,          -- [{id, name, gender, age_min, age_max, quantity, description}]
  selftape_required BOOLEAN NOT NULL DEFAULT false,  -- NSX bắt buộc self-tape
  selftape_brief TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  share_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  hide_contacts BOOLEAN NOT NULL DEFAULT false,      -- Ẩn SĐT/email trên link NSX
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_casting_projects_status ON public.casting_projects(status);

DROP TRIGGER IF EXISTS trg_casting_projects_updated_at ON public.casting_projects;
CREATE TRIGGER trg_casting_projects_updated_at
  BEFORE UPDATE ON public.casting_projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. BẢNG ỨNG TUYỂN -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.casting_projects(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL,
  talent_id UUID NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  selftape_url TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'shortlisted', 'sent', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (project_id, role_id, talent_id)
);

CREATE INDEX IF NOT EXISTS idx_project_applications_project ON public.project_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_project_applications_talent ON public.project_applications(talent_id);

DROP TRIGGER IF EXISTS trg_project_applications_updated_at ON public.project_applications;
CREATE TRIGGER trg_project_applications_updated_at
  BEFORE UPDATE ON public.project_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.casting_projects;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.project_applications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- 3. HÀM KIỂM TRA NHÂN SỰ -------------------------------------------------------
-- SECURITY DEFINER để đọc bảng profiles mà không bị RLS chặn (tránh vòng lặp policy).
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND p.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff() FROM public;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- 4. KHOÁ TOÀN BỘ POLICY CŨ (mở cho mọi người) ---------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'leads', 'talent_profiles', 'webhook_logs', 'casting_projects', 'project_applications')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casting_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_applications ENABLE ROW LEVEL SECURITY;

-- Khách vãng lai: thu hồi mọi quyền trên bảng (lớp bảo vệ thứ hai ngoài RLS).
REVOKE ALL ON public.profiles, public.leads, public.talent_profiles, public.webhook_logs,
  public.casting_projects, public.project_applications FROM anon;

-- 5. POLICY MỚI: CHỈ NHÂN SỰ ĐANG HOẠT ĐỘNG ------------------------------------
CREATE POLICY "staff_all_profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "staff_all_leads" ON public.leads
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "staff_all_talent_profiles" ON public.talent_profiles
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "staff_all_webhook_logs" ON public.webhook_logs
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "staff_all_casting_projects" ON public.casting_projects
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "staff_all_project_applications" ON public.project_applications
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 6. STORAGE: ảnh hồ sơ chỉ được tải lên qua API server (service role) ---------
-- Bucket talent-media vẫn public-read (ảnh dùng URL ngẫu nhiên, khó đoán) để hiển thị comp-card.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (qual ILIKE '%talent-media%' OR with_check ILIKE '%talent-media%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END $$;
