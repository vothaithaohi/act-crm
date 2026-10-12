-- ==============================================================================
-- DIENVIENVN.COM — HỒ SƠ CASTING TỰ NỘP
-- Thêm nguồn hồ sơ & trạng thái duyệt cho talent_profiles để CRM review / lọc
-- các hồ sơ diễn viên nộp từ dienvienvn.com. Chạy file này trong Supabase SQL Editor.
-- ==============================================================================

ALTER TABLE public.talent_profiles
  ADD COLUMN IF NOT EXISTS submission_source TEXT NOT NULL DEFAULT 'crm',
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

ALTER TABLE public.talent_profiles DROP CONSTRAINT IF EXISTS talent_profiles_submission_source_check;
ALTER TABLE public.talent_profiles ADD CONSTRAINT talent_profiles_submission_source_check
  CHECK (submission_source IN ('crm', 'dienvienvn'));

ALTER TABLE public.talent_profiles DROP CONSTRAINT IF EXISTS talent_profiles_review_status_check;
ALTER TABLE public.talent_profiles ADD CONSTRAINT talent_profiles_review_status_check
  CHECK (review_status IN ('pending', 'approved', 'rejected'));

-- Hồ sơ cũ: tạo từ CRM => đã duyệt (default đã xử lý), không cần cập nhật thêm.

CREATE INDEX IF NOT EXISTS idx_talent_review_status ON public.talent_profiles(review_status);
CREATE INDEX IF NOT EXISTS idx_talent_submission_source ON public.talent_profiles(submission_source);
CREATE INDEX IF NOT EXISTS idx_talent_submitted_at ON public.talent_profiles(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_talent_phone ON public.talent_profiles(phone);

-- Bật Realtime để CRM nhận hồ sơ mới ngay khi diễn viên bấm nộp (không cần tải lại trang).
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.talent_profiles;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
