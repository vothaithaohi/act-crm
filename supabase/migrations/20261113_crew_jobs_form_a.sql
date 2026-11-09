-- Tin tuyển dụng ekip theo Form A (tài liệu Trang tuyển dụng). Chạy lại nhiều lần vẫn an toàn.
-- Tin cũ giữ nguyên các cột cũ (title, positions, description, contact…) và vẫn hiện bình thường.
ALTER TABLE public.crew_jobs
  ADD COLUMN IF NOT EXISTS company_type TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS project_name TEXT,
  ADD COLUMN IF NOT EXISTS project_hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS project_type TEXT,
  ADD COLUMN IF NOT EXISTS project_phase TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS role_title TEXT,
  ADD COLUMN IF NOT EXISTS seniority_level TEXT,
  ADD COLUMN IF NOT EXISTS employment_type TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS shooting_days INTEGER,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS location_detail TEXT,
  ADD COLUMN IF NOT EXISTS work_mode TEXT,
  ADD COLUMN IF NOT EXISTS salary_type TEXT,
  ADD COLUMN IF NOT EXISTS salary_min BIGINT,
  ADD COLUMN IF NOT EXISTS salary_max BIGINT,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'VND';
CREATE INDEX IF NOT EXISTS idx_crew_jobs_department ON public.crew_jobs (department, role_title);
