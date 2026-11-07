-- Tin tuyển ekip (VD: ekip audition, trợ lý casting, quay phim, makeup…) hiện ở dienvienvn.com/tuyen-dung.
-- Đối tác tự đăng → chờ DienVienVN duyệt (draft → open); nhân sự ACT cũng tạo / sửa trong CRM.
-- Người ứng tuyển xem tin và liên hệ trực tiếp theo thông tin liên hệ trong tin.
CREATE TABLE IF NOT EXISTS public.crew_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partner_accounts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  company TEXT,
  positions TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  location TEXT,
  work_time TEXT,
  compensation TEXT,
  contact TEXT NOT NULL,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crew_jobs_status ON public.crew_jobs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crew_jobs_partner ON public.crew_jobs (partner_id);

-- Chỉ nhân sự CRM đọc / ghi trực tiếp; trang công khai đọc qua máy chủ (chỉ tin đang mở)
ALTER TABLE public.crew_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_all_crew_jobs ON public.crew_jobs;
CREATE POLICY staff_all_crew_jobs ON public.crew_jobs
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
REVOKE ALL ON public.crew_jobs FROM anon;

-- "tuyen-dung" là đường dẫn của trang web, không dùng làm username diễn viên
CREATE OR REPLACE FUNCTION public.dvvn_reserved_username(u TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT u = ANY (ARRAY[
    'admin','api','dienvienvn','dien-vien','dienvien','nop-ho-so','du-an','nsx','dang-nhap','tai-khoan','tao-mat-khau',
    'doi-tac','doitac','login','leads','talents','projects','casting','settings','robots','sitemap','llms','favicon','www',
    'mail','support','help','about','privacy','terms','static','assets','images','img','r','send','guests','khach-moi',
    'tuyen-dung','crew-jobs'
  ])
$$;

NOTIFY pgrst, 'reload schema';
