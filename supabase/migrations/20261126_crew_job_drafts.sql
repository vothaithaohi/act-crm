-- Bản nháp tin tuyển ekip: lưu được khi chưa điền đủ, tự lưu khi đang nhập.
-- partner_id NULL = bản nháp của team ACT (dùng chung trong CRM); có partner_id = bản nháp của đối tác đó.
-- Bản nháp không bao giờ hiện trên dienvienvn.com. Chỉ máy chủ (service role) đọc / ghi. Chạy lại nhiều lần vẫn an toàn.
CREATE TABLE IF NOT EXISTS public.crew_job_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  form JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crew_job_drafts_partner ON public.crew_job_drafts (partner_id, updated_at DESC);

ALTER TABLE public.crew_job_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crew_job_drafts FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
