-- Diễn viên tự sửa self-tape của vai đã ứng tuyển (khi dự án còn nhận hồ sơ).
-- Ghi lại thời điểm sửa gần nhất để CRM / NSX biết self-tape vừa cập nhật. Chạy lại nhiều lần vẫn an toàn.
ALTER TABLE public.project_applications ADD COLUMN IF NOT EXISTS selftape_updated_at TIMESTAMPTZ;
