-- Thư viện self-tape của diễn viên (tối đa 3 video nổi bật hiện công khai)
-- và các self-tape diễn viên chọn khi ứng tuyển. Chạy lại nhiều lần vẫn an toàn.
ALTER TABLE public.talent_profiles ADD COLUMN IF NOT EXISTS selftapes JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.project_applications ADD COLUMN IF NOT EXISTS selftape_urls TEXT[] NOT NULL DEFAULT '{}';
