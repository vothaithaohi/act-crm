-- ==============================================================================
-- ĐỒNG BỘ SCHEMA — sửa lỗi "Hệ thống đang bận, hồ sơ chưa được lưu" khi nộp hồ sơ
-- Database được tạo từ 20250101_init_crm.sql nên còn thiếu một số cột mà app đang
-- ghi vào (VD: talent_profiles.academic_profile). File này chạy lại an toàn nhiều lần.
-- Chạy trong Supabase SQL Editor.
-- ==============================================================================

-- 1) talent_profiles: quá trình đào tạo diễn xuất (bước 7 của form)
ALTER TABLE public.talent_profiles
  ADD COLUMN IF NOT EXISTS academic_profile JSONB
    DEFAULT '{"highest_act_level": null, "enrollments": [], "total_courses_count": 0}'::jsonb;

-- 2) talent_profiles: cột duyệt hồ sơ DienVienVN (phòng khi 20261012 chưa chạy đủ)
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

-- 3) leads: cột CRM đang dùng nhưng bản init chưa có
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS academic_profile JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tuition_fee NUMERIC DEFAULT 0;

-- 4) leads.status: chấp nhận cả trạng thái pipeline mới lẫn trạng thái cũ
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check CHECK (status IN (
  'intake', 'qualified', 'contacted', 'considering', 'trial_in_person', 'follow_up_later', 'converted',
  'new', 'audition_scheduled', 'audition_passed', 'enrolled', 'lost'
));

-- 5) Báo PostgREST nạp lại schema để API thấy cột mới ngay
NOTIFY pgrst, 'reload schema';
