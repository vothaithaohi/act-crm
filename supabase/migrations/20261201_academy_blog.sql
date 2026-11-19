-- Academy: blog kiến thức trên dienvienvn.com/academy. Admin viết bài trong CRM (mục "Academy · Blog").
-- Mỗi bài có bản tiếng Việt (gốc) và bản tiếng Anh (AI dịch, sửa lại được) cho dienvienvn.com/en/academy.
-- Đọc / ghi qua máy chủ (API), không mở trực tiếp cho trình duyệt. Chạy lại nhiều lần vẫn an toàn.
CREATE TABLE IF NOT EXISTS public.academy_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,118}$'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  category TEXT NOT NULL DEFAULT 'kien-thuc',
  cover_url TEXT,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  title_en TEXT,
  excerpt_en TEXT,
  content_en TEXT,
  -- Bản tiếng Anh do AI dịch và chưa ai sửa (sửa nội dung tiếng Việt thì nhắc dịch lại)
  en_source_hash TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_academy_posts_published ON public.academy_posts (status, published_at DESC);

ALTER TABLE public.academy_posts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.academy_posts FROM anon, authenticated;

-- "academy", "en", "vi" là đường dẫn của trang web, không dùng làm username diễn viên
CREATE OR REPLACE FUNCTION public.dvvn_reserved_username(u TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT u = ANY (ARRAY[
    'admin','api','dienvienvn','dien-vien','dienvien','nop-ho-so','du-an','nsx','dang-nhap','tai-khoan','tao-mat-khau',
    'doi-tac','doitac','login','leads','talents','projects','casting','settings','robots','sitemap','llms','favicon','www',
    'mail','support','help','about','privacy','terms','static','assets','images','img','r','send','guests','khach-moi',
    'tuyen-dung','crew-jobs','kho','talent-links','academy','en','vi'
  ])
$$;

NOTIFY pgrst, 'reload schema';
