-- AI tạo hồ sơ diễn viên từ tên / link (chỉ Super Admin, Casting dùng).
-- Hồ sơ AI tạo: submission_source = 'ai', trạng thái Chờ duyệt, mặc định chỉ trong CRM (không công khai);
-- chỉ bật công khai khi diễn viên / agency đồng ý. Nguồn tham khảo và tiểu sử lưu ở ai_profile.
-- Chạy lại nhiều lần vẫn an toàn.
ALTER TABLE public.talent_profiles ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.talent_profiles ADD COLUMN IF NOT EXISTS ai_profile JSONB;

ALTER TABLE public.talent_profiles DROP CONSTRAINT IF EXISTS talent_profiles_submission_source_check;
ALTER TABLE public.talent_profiles ADD CONSTRAINT talent_profiles_submission_source_check
  CHECK (submission_source IN ('crm', 'dienvienvn', 'ai'));

-- Lượt chạy AI (chạy nền 1–2 phút): trạng thái, lỗi, số token / lượt tìm web để theo dõi chi phí
CREATE TABLE IF NOT EXISTS public.ai_profile_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by TEXT,
  input JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'done', 'failed')),
  talent_id UUID REFERENCES public.talent_profiles(id) ON DELETE SET NULL,
  error TEXT,
  usage JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_profile_jobs_created ON public.ai_profile_jobs (created_at DESC);

ALTER TABLE public.ai_profile_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_profile_jobs FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
