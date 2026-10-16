-- ==============================================================================
-- TÀI KHOẢN ĐỐI TÁC (đạo diễn, nhà sản xuất, đối tác tìm diễn viên qua ACT)
-- - Do nhân sự CRM tạo; đối tác nhận email mời và tự đặt mật khẩu.
-- - Đăng nhập tại dienvienvn.com/doi-tac để xem ĐẦY ĐỦ hồ sơ diễn viên đã duyệt.
-- - Chỉ máy chủ (service role) đọc/ghi bảng này; trình duyệt không truy cập trực tiếp.
-- Chạy trong Supabase SQL Editor. Chạy lại nhiều lần vẫn an toàn.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.partner_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  company TEXT,
  partner_type TEXT NOT NULL DEFAULT 'producer',
  status TEXT NOT NULL DEFAULT 'active',
  note TEXT,
  auth_user_id UUID,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ
);

ALTER TABLE public.partner_accounts DROP CONSTRAINT IF EXISTS partner_accounts_type_check;
ALTER TABLE public.partner_accounts ADD CONSTRAINT partner_accounts_type_check
  CHECK (partner_type IN ('director', 'producer', 'casting', 'agency', 'brand', 'other'));
ALTER TABLE public.partner_accounts DROP CONSTRAINT IF EXISTS partner_accounts_status_check;
ALTER TABLE public.partner_accounts ADD CONSTRAINT partner_accounts_status_check
  CHECK (status IN ('active', 'disabled'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_accounts_email ON public.partner_accounts (lower(email));
CREATE INDEX IF NOT EXISTS idx_partner_accounts_auth_user ON public.partner_accounts (auth_user_id);

-- Bật RLS, không tạo policy: chỉ service role (API máy chủ) truy cập được
ALTER TABLE public.partner_accounts ENABLE ROW LEVEL SECURITY;

-- "doi-tac" là đường dẫn của cổng đối tác, không được dùng làm username diễn viên
CREATE OR REPLACE FUNCTION public.dvvn_reserved_username(u TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT u = ANY (ARRAY[
    'admin','api','dienvienvn','dien-vien','dienvien','nop-ho-so','du-an','nsx','dang-nhap','tai-khoan','tao-mat-khau',
    'doi-tac','doitac','login','leads','talents','projects','casting','settings','robots','sitemap','llms','favicon','www',
    'mail','support','help','about','privacy','terms','static','assets','images','img','r','send'
  ])
$$;

NOTIFY pgrst, 'reload schema';
