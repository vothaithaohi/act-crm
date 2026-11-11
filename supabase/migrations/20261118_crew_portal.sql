-- Cổng ứng viên ekip: kho CV (file PDF riêng tư hoặc link), CV + cover letter gửi kèm từng lượt ứng tuyển.
-- Chạy lại nhiều lần vẫn an toàn. Cần chạy sau 20261115_crew_profiles.sql và 20261116_crew_cv.sql.

-- 1. Kho CV của ứng viên ekip (tối đa 5 CV / tài khoản, kiểm tra ở máy chủ)
CREATE TABLE IF NOT EXISTS public.crew_cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_profile_id UUID NOT NULL REFERENCES public.crew_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  -- File PDF trong kho riêng tư crew-cv (đường dẫn trong bucket) hoặc link ngoài (Google Drive…)
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  link_url TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (file_path IS NOT NULL OR link_url IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_crew_cvs_profile ON public.crew_cvs (crew_profile_id, created_at DESC);

ALTER TABLE public.crew_cvs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_all_crew_cvs ON public.crew_cvs;
CREATE POLICY staff_all_crew_cvs ON public.crew_cvs
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
REVOKE ALL ON public.crew_cvs FROM anon;

-- Link CV cũ trong hồ sơ → chuyển vào kho CV (CV mặc định)
INSERT INTO public.crew_cvs (crew_profile_id, title, link_url, is_default)
SELECT p.id, 'CV', p.cv_url, true
FROM public.crew_profiles p
WHERE p.cv_url IS NOT NULL AND p.cv_url <> ''
  AND NOT EXISTS (SELECT 1 FROM public.crew_cvs c WHERE c.crew_profile_id = p.id);

-- 2. CV + cover letter gửi kèm mỗi lượt ứng tuyển (bản chụp: ứng viên xoá CV khỏi kho thì NSX vẫn xem được bản đã nộp)
ALTER TABLE public.crew_applications ADD COLUMN IF NOT EXISTS cv_title TEXT;
ALTER TABLE public.crew_applications ADD COLUMN IF NOT EXISTS cv_path TEXT;
ALTER TABLE public.crew_applications ADD COLUMN IF NOT EXISTS cv_link TEXT;
ALTER TABLE public.crew_applications ADD COLUMN IF NOT EXISTS cover_letter TEXT;
ALTER TABLE public.crew_applications ADD COLUMN IF NOT EXISTS cover_letter_path TEXT;

-- 3. Kho file riêng tư cho CV / cover letter (chỉ PDF, tối đa 4MB). Không public: xem qua link tạm có hạn.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('crew-cv', 'crew-cv', false, 4194304, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 4194304, allowed_mime_types = ARRAY['application/pdf'];

NOTIFY pgrst, 'reload schema';
