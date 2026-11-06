-- Đối tác tự đăng ký tại dienvienvn.com/doi-tac/dang-ky: tài khoản ở trạng thái 'pending' (chờ DienVienVN duyệt).
-- Khi ACT bấm "Duyệt" trong CRM → 'active' và hệ thống gửi email để đối tác tự đặt mật khẩu.
ALTER TABLE public.partner_accounts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.partner_accounts DROP CONSTRAINT IF EXISTS partner_accounts_status_check;
ALTER TABLE public.partner_accounts ADD CONSTRAINT partner_accounts_status_check
  CHECK (status IN ('pending', 'active', 'disabled'));
CREATE INDEX IF NOT EXISTS idx_partner_accounts_status ON public.partner_accounts (status);
NOTIFY pgrst, 'reload schema';
