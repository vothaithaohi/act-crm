-- Link kho diễn viên gửi NSX: dienvienvn.com/kho/<mã> hiện toàn bộ hồ sơ đã duyệt (cấp công khai:
-- ảnh, tên, khoảng tuổi, chiều cao, cân nặng, kinh nghiệm, kỹ năng). Đối tác đã duyệt đăng nhập xem đầy đủ.
-- Link không công khai, hết hạn sau 30 ngày, nhân sự ACT tạo / gia hạn / thu hồi trong CRM.
CREATE TABLE IF NOT EXISTS public.talent_catalog_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  label TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 days',
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.talent_catalog_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_all_talent_catalog_links ON public.talent_catalog_links;
CREATE POLICY staff_all_talent_catalog_links ON public.talent_catalog_links
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
REVOKE ALL ON public.talent_catalog_links FROM anon;

-- "kho" là đường dẫn của trang web, không dùng làm username diễn viên
CREATE OR REPLACE FUNCTION public.dvvn_reserved_username(u TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT u = ANY (ARRAY[
    'admin','api','dienvienvn','dien-vien','dienvien','nop-ho-so','du-an','nsx','dang-nhap','tai-khoan','tao-mat-khau',
    'doi-tac','doitac','login','leads','talents','projects','casting','settings','robots','sitemap','llms','favicon','www',
    'mail','support','help','about','privacy','terms','static','assets','images','img','r','send','guests','khach-moi',
    'tuyen-dung','crew-jobs','kho','talent-links'
  ])
$$;

NOTIFY pgrst, 'reload schema';
