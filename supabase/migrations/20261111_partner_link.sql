-- Link riêng của NSX (dienvienvn.com/doi-tac/link/<mã>): gộp link shortlist và link đối tác thành 1.
-- Không cần đăng nhập, không hết hạn; ngừng khi ACT khoá tài khoản đối tác. Chạy lại nhiều lần vẫn an toàn.
ALTER TABLE public.partner_accounts ADD COLUMN IF NOT EXISTS link_token TEXT;
ALTER TABLE public.partner_accounts
  ALTER COLUMN link_token SET DEFAULT substr(replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 1, 20);
UPDATE public.partner_accounts
  SET link_token = substr(replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 1, 20)
  WHERE link_token IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_accounts_link_token ON public.partner_accounts (link_token);
