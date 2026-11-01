-- ==============================================================================
-- KHÁCH MỜI SHOWCASE (chỉ dùng nội bộ CRM)
-- Đạo diễn, nhà sản xuất, giảng viên… được mời làm khách mời / giám khảo các buổi showcase.
-- - showcase_guests: thông tin khách mời
-- - showcase_invitations: lịch sử mời theo Term / lớp / buổi và trạng thái (đã nhận lời, đã tham dự…)
-- - showcase_guest_reviews: nhận xét về khách mời của Kathy Uyên, team office ACT…
-- Chỉ nhân sự CRM đang hoạt động (is_staff) đọc / ghi được; không hiện trên dienvienvn.com.
-- Chạy trong Supabase SQL Editor. Chạy lại nhiều lần vẫn an toàn.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.showcase_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  call_name TEXT,                       -- Tên gọi (cột FIRST NAME), VD: "Hiệp"
  title TEXT,                           -- Chức danh: Đạo diễn, Nhà sản xuất, Diễn viên…
  phone TEXT,
  email TEXT,
  bio TEXT,
  photo_url TEXT,
  talkativity SMALLINT,                 -- Mức độ nói nhiều / chia sẻ (Level of Talkativity)
  judge_notes TEXT,                     -- Nhận xét tiềm năng làm giám khảo
  contact_future BOOLEAN,               -- Có liên hệ mời tiếp trong tương lai
  suitable_for TEXT[] NOT NULL DEFAULT '{}',  -- VD: Showcase, Workshop, ACT1…
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.showcase_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES public.showcase_guests(id) ON DELETE CASCADE,
  term TEXT NOT NULL,                   -- VD: "TERM 36"
  class_code TEXT,                      -- VD: "ACT1A"
  session TEXT,                         -- VD: "AM", "PM", "27 AM", "9/7/2023"
  status TEXT NOT NULL DEFAULT 'not_contacted',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.showcase_invitations DROP CONSTRAINT IF EXISTS showcase_invitations_status_check;
ALTER TABLE public.showcase_invitations ADD CONSTRAINT showcase_invitations_status_check
  CHECK (status IN ('not_contacted', 'contacting', 'waiting', 'confirmed', 'success', 'busy', 'rejected', 'failed', 'skipped'));

CREATE TABLE IF NOT EXISTS public.showcase_guest_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES public.showcase_guests(id) ON DELETE CASCADE,
  reviewer TEXT NOT NULL,               -- VD: "Kathy Uyên", "Team office ACT"
  rating SMALLINT,                      -- 1–5 sao (không bắt buộc)
  term TEXT,                            -- Showcase được nhận xét (không bắt buộc)
  content TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.showcase_guest_reviews DROP CONSTRAINT IF EXISTS showcase_guest_reviews_rating_check;
ALTER TABLE public.showcase_guest_reviews ADD CONSTRAINT showcase_guest_reviews_rating_check
  CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);

CREATE INDEX IF NOT EXISTS idx_showcase_invitations_guest ON public.showcase_invitations(guest_id);
CREATE INDEX IF NOT EXISTS idx_showcase_invitations_term ON public.showcase_invitations(term);
CREATE INDEX IF NOT EXISTS idx_showcase_guest_reviews_guest ON public.showcase_guest_reviews(guest_id);

-- Chỉ nhân sự CRM đang hoạt động
ALTER TABLE public.showcase_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_guest_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.showcase_guests, public.showcase_invitations, public.showcase_guest_reviews FROM anon;

DROP POLICY IF EXISTS "staff_all_showcase_guests" ON public.showcase_guests;
CREATE POLICY "staff_all_showcase_guests" ON public.showcase_guests
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "staff_all_showcase_invitations" ON public.showcase_invitations;
CREATE POLICY "staff_all_showcase_invitations" ON public.showcase_invitations
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "staff_all_showcase_guest_reviews" ON public.showcase_guest_reviews;
CREATE POLICY "staff_all_showcase_guest_reviews" ON public.showcase_guest_reviews
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- "guests" là đường dẫn CRM (admin.dienvienvn.com/guests), không dùng làm username diễn viên
CREATE OR REPLACE FUNCTION public.dvvn_reserved_username(u TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT u = ANY (ARRAY[
    'admin','api','dienvienvn','dien-vien','dienvien','nop-ho-so','du-an','nsx','dang-nhap','tai-khoan','tao-mat-khau',
    'doi-tac','doitac','login','leads','talents','projects','casting','settings','robots','sitemap','llms','favicon','www',
    'mail','support','help','about','privacy','terms','static','assets','images','img','r','send','guests','khach-moi'
  ])
$$;

NOTIFY pgrst, 'reload schema';
