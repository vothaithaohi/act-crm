-- Referral: ghi nguồn giới thiệu cho từng hồ sơ diễn viên (link dienvienvn.com/?ref=<mã>).
-- Chạy lại nhiều lần vẫn an toàn.
ALTER TABLE public.talent_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.talent_profiles ADD COLUMN IF NOT EXISTS referral_note TEXT;
ALTER TABLE public.talent_profiles ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE public.talent_profiles ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE public.talent_profiles ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE public.talent_profiles ADD COLUMN IF NOT EXISTS referred_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_talent_profiles_referral_code ON public.talent_profiles (referral_code);

-- Danh sách người giới thiệu (CRM mục "Giới thiệu (Referral)"). Chỉ đọc / ghi qua máy chủ.
CREATE TABLE IF NOT EXISTS public.referrers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9][a-z0-9_-]{1,39}$'),
  name TEXT NOT NULL,
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referrers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.referrers FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
