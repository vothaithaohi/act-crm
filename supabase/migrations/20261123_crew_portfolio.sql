-- CV / Portfolio cho tin tuyển ekip (chỉ tải file, không dán link):
--  1. Tin có "Yêu cầu hồ sơ đính kèm": none | cv | portfolio | either (CV hoặc Portfolio) | both (cả hai)
--  2. Kho file của ứng viên có thêm loại "portfolio"
--  3. Mỗi lượt ứng tuyển lưu thêm Portfolio đã nộp
-- Chạy sau 20261119_crew_files_v2.sql. Chạy lại nhiều lần vẫn an toàn.

ALTER TABLE public.crew_jobs ADD COLUMN IF NOT EXISTS attach_requirement TEXT;
-- Tin cũ đang tick "Yêu cầu gửi kèm portfolio/CV" → "CV hoặc Portfolio"
UPDATE public.crew_jobs SET attach_requirement = CASE WHEN requires_cv THEN 'either' ELSE 'none' END WHERE attach_requirement IS NULL;
ALTER TABLE public.crew_jobs ALTER COLUMN attach_requirement SET DEFAULT 'none';
ALTER TABLE public.crew_jobs DROP CONSTRAINT IF EXISTS crew_jobs_attach_requirement_check;
ALTER TABLE public.crew_jobs ADD CONSTRAINT crew_jobs_attach_requirement_check
  CHECK (attach_requirement IS NULL OR attach_requirement IN ('none', 'cv', 'portfolio', 'either', 'both'));

ALTER TABLE public.crew_cvs DROP CONSTRAINT IF EXISTS crew_cvs_kind_check;
ALTER TABLE public.crew_cvs ADD CONSTRAINT crew_cvs_kind_check CHECK (kind IN ('cv', 'cover', 'portfolio'));

ALTER TABLE public.crew_applications ADD COLUMN IF NOT EXISTS portfolio_title TEXT;
ALTER TABLE public.crew_applications ADD COLUMN IF NOT EXISTS portfolio_path TEXT;

NOTIFY pgrst, 'reload schema';
