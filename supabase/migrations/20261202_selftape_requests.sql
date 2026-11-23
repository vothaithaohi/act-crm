-- Yêu cầu self-tape theo vai: diễn viên nộp mỗi yêu cầu 1 link (lưu ở selftape_items), sửa / bổ sung được sau khi ứng tuyển.
-- Yêu cầu của vai lưu trong casting_projects.roles (không cần cột mới). Chạy lại nhiều lần vẫn an toàn.
ALTER TABLE public.project_applications ADD COLUMN IF NOT EXISTS selftape_items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.project_applications ADD COLUMN IF NOT EXISTS selftape_updated_at TIMESTAMPTZ;
NOTIFY pgrst, 'reload schema';
