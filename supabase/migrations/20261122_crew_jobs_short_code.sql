-- Link gọn cho tin tuyển ekip: www.dienvienvn.com/ekip/<tên-vị-trí>-<mã 6 ký tự>
-- Mỗi tin có 1 mã ngắn ngẫu nhiên (chữ thường + số). Tin cũ được cấp mã; link cũ /tuyen-dung/ung-tuyen/<id> tự chuyển sang link mới.
-- Chạy lại nhiều lần vẫn an toàn.
CREATE OR REPLACE FUNCTION public.dvvn_short_code() RETURNS TEXT
LANGUAGE sql VOLATILE AS $$
  SELECT string_agg(substr('abcdefghjkmnpqrstuvwxyz23456789', 1 + floor(random() * 31)::int, 1), '')
  FROM generate_series(1, 6);
$$;

ALTER TABLE public.crew_jobs ADD COLUMN IF NOT EXISTS short_code TEXT;
ALTER TABLE public.crew_jobs ALTER COLUMN short_code SET DEFAULT public.dvvn_short_code();

-- Cấp mã cho tin cũ (lặp tới khi không trùng)
DO $$
DECLARE r RECORD; c TEXT;
BEGIN
  FOR r IN SELECT id FROM public.crew_jobs WHERE short_code IS NULL LOOP
    LOOP
      c := public.dvvn_short_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.crew_jobs WHERE short_code = c);
    END LOOP;
    UPDATE public.crew_jobs SET short_code = c WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_crew_jobs_short_code ON public.crew_jobs (short_code);
NOTIFY pgrst, 'reload schema';
