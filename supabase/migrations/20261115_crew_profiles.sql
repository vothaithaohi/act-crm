-- Task 34: hồ sơ ekip (Form B) + ứng tuyển tin tuyển ekip. Chạy lại nhiều lần vẫn an toàn.
-- Ekip bấm "Ứng tuyển" → tạo hồ sơ (chờ ACT duyệt) → ứng tuyển. NSX chỉ thấy ứng viên có hồ sơ đã duyệt.
CREATE TABLE IF NOT EXISTS public.crew_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID,
  -- 1. Thông tin cá nhân & nghệ danh
  full_name TEXT NOT NULL,
  display_name TEXT,
  base_city TEXT,
  willing_to_travel BOOLEAN NOT NULL DEFAULT false,
  -- 2. Chuyên môn chính (theo danh mục của form đăng tuyển)
  primary_department TEXT NOT NULL,
  primary_role TEXT NOT NULL,
  primary_role_other TEXT,
  secondary_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  years_of_experience TEXT NOT NULL,
  -- 3. Năng lực & showreel
  primary_showreel_url TEXT,
  portfolio_url TEXT,
  filmography_credits JSONB NOT NULL DEFAULT '[]'::jsonb,
  software_skills TEXT[] NOT NULL DEFAULT '{}',
  owned_gear TEXT,
  -- 4. Tình trạng nhận việc & thù lao kỳ vọng
  availability_status TEXT NOT NULL,
  busy_until DATE,
  day_rate BIGINT,
  project_rate BIGINT,
  rate_negotiable BOOLEAN NOT NULL DEFAULT false,
  -- 5. Kênh liên hệ (email công việc cũng là email đăng nhập)
  public_email TEXT NOT NULL,
  public_phone TEXT,
  phone_verified_only BOOLEAN NOT NULL DEFAULT false,
  social_link TEXT,
  -- ACT duyệt hồ sơ
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_crew_profiles_email ON public.crew_profiles (lower(public_email));
CREATE INDEX IF NOT EXISTS idx_crew_profiles_user ON public.crew_profiles (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_crew_profiles_review ON public.crew_profiles (review_status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crew_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.crew_jobs(id) ON DELETE CASCADE,
  crew_profile_id UUID NOT NULL REFERENCES public.crew_profiles(id) ON DELETE CASCADE,
  -- Thời điểm đã gửi email báo NSX (gửi khi hồ sơ đã được duyệt)
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, crew_profile_id)
);
CREATE INDEX IF NOT EXISTS idx_crew_applications_job ON public.crew_applications (job_id);
CREATE INDEX IF NOT EXISTS idx_crew_applications_profile ON public.crew_applications (crew_profile_id);

-- Chỉ nhân sự CRM đọc / ghi trực tiếp; ekip và đối tác đi qua máy chủ
ALTER TABLE public.crew_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_all_crew_profiles ON public.crew_profiles;
CREATE POLICY staff_all_crew_profiles ON public.crew_profiles
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
REVOKE ALL ON public.crew_profiles FROM anon;

ALTER TABLE public.crew_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_all_crew_applications ON public.crew_applications;
CREATE POLICY staff_all_crew_applications ON public.crew_applications
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
REVOKE ALL ON public.crew_applications FROM anon;

NOTIFY pgrst, 'reload schema';
