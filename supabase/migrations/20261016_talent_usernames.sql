-- ==============================================================================
-- USERNAME & HỒ SƠ CÔNG KHAI CHO DIỄN VIÊN
-- - username: đường dẫn riêng dienvienvn.com/<username> (và admin.dienvienvn.com/<username>).
--   Tự tạo từ họ tên (bỏ dấu, viết liền), trùng tên thì thêm số: phamthaikhuong, phamthaikhuong2…
--   Áp dụng cho MỌI cách tạo hồ sơ (form DienVienVN, CRM, nhập Excel) nhờ trigger.
-- - public_profile: diễn viên đồng ý hiển thị hồ sơ trên trang công khai.
-- Chạy trong Supabase SQL Editor. Chạy lại nhiều lần vẫn an toàn.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE public.talent_profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS public_profile BOOLEAN NOT NULL DEFAULT false;

-- Đường dẫn của trang web, không được dùng làm username
CREATE OR REPLACE FUNCTION public.dvvn_reserved_username(u TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT u = ANY (ARRAY[
    'admin','api','dienvienvn','dien-vien','dienvien','nop-ho-so','du-an','nsx','dang-nhap','tai-khoan','tao-mat-khau',
    'login','leads','talents','projects','casting','settings','robots','sitemap','llms','favicon','www','mail','support',
    'help','about','privacy','terms','static','assets','images','img','r','send'
  ])
$$;

-- "Phạm Thái Khương" → "phamthaikhuong"
CREATE OR REPLACE FUNCTION public.dvvn_slugify(txt TEXT) RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT left(regexp_replace(lower(public.unaccent(replace(replace(coalesce(txt, ''), 'đ', 'd'), 'Đ', 'D'))), '[^a-z0-9]+', '', 'g'), 30)
$$;

CREATE OR REPLACE FUNCTION public.dvvn_unique_username(full_name TEXT, own_id UUID) RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  base TEXT := public.dvvn_slugify(full_name);
  candidate TEXT;
  n INT := 1;
BEGIN
  IF base IS NULL OR length(base) < 3 THEN base := 'dienvien' || coalesce(base, ''); END IF;
  IF public.dvvn_reserved_username(base) THEN base := base || 'dv'; END IF;
  candidate := base;
  WHILE EXISTS (
    SELECT 1 FROM public.talent_profiles WHERE lower(username) = candidate AND id IS DISTINCT FROM own_id
  ) LOOP
    n := n + 1;
    candidate := base || n::TEXT;
  END LOOP;
  RETURN candidate;
END $$;

CREATE OR REPLACE FUNCTION public.talent_profiles_set_username() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.username IS NULL OR btrim(NEW.username) = '' THEN
    NEW.username := public.dvvn_unique_username(NEW.full_name, NEW.id);
  ELSE
    NEW.username := lower(btrim(NEW.username));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_talent_profiles_username ON public.talent_profiles;
CREATE TRIGGER trg_talent_profiles_username
  BEFORE INSERT OR UPDATE OF username ON public.talent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.talent_profiles_set_username();

-- Tạo username cho các hồ sơ đã có (từng dòng một để không trùng nhau)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id, full_name FROM public.talent_profiles WHERE username IS NULL OR btrim(username) = '' ORDER BY created_at LOOP
    UPDATE public.talent_profiles SET username = public.dvvn_unique_username(r.full_name, r.id) WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_talent_username ON public.talent_profiles (lower(username));

-- Chỉ chữ thường không dấu, số, "-" và "_" (dấu chấm làm đường dẫn bị hiểu nhầm là file)
ALTER TABLE public.talent_profiles DROP CONSTRAINT IF EXISTS talent_profiles_username_format;
ALTER TABLE public.talent_profiles ADD CONSTRAINT talent_profiles_username_format
  CHECK (username ~ '^[a-z0-9][a-z0-9_-]{2,39}$');

NOTIFY pgrst, 'reload schema';
