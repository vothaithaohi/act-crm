-- Giả lập bằng tài khoản test của chính Super Admin (không giả lập tài khoản người khác).
-- Mỗi Super Admin có tối đa 1 tài khoản test cho mỗi vai: diễn viên / nhà sản xuất (đối tác) / ứng viên ekip.
-- Mọi dữ liệu thuộc các tài khoản này được CRM đánh dấu TEST. Chạy lại nhiều lần vẫn an toàn.
CREATE TABLE IF NOT EXISTS public.impersonation_test_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('actor', 'partner', 'crew')),
  auth_user_id UUID NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_impersonation_test_account ON public.impersonation_test_accounts (lower(admin_email), kind);
CREATE INDEX IF NOT EXISTS idx_impersonation_test_user ON public.impersonation_test_accounts (auth_user_id);

ALTER TABLE public.impersonation_test_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_read_impersonation_test ON public.impersonation_test_accounts;
CREATE POLICY staff_read_impersonation_test ON public.impersonation_test_accounts FOR SELECT TO authenticated USING (public.is_staff());
REVOKE ALL ON public.impersonation_test_accounts FROM anon;

-- Phiên giả lập cũ (giả lập tài khoản người khác) kết thúc hết
UPDATE public.impersonation_sessions s SET ended_at = now()
WHERE s.ended_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.impersonation_test_accounts t WHERE t.auth_user_id = s.target_user_id);

NOTIFY pgrst, 'reload schema';
