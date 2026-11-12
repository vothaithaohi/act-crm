-- Task 55 + 57: tin tuyển ekip
--  - other_values: chữ tự ghi khi chọn "Khác" ở các ô chọn (loại hình đơn vị, dự án, giai đoạn, cấp độ, hình thức, thành phố, chế độ, thù lao)
--  - quantity: số lượng cần tuyển cho vị trí
-- Chạy lại nhiều lần vẫn an toàn.
ALTER TABLE public.crew_jobs ADD COLUMN IF NOT EXISTS other_values JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.crew_jobs ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE public.crew_jobs DROP CONSTRAINT IF EXISTS crew_jobs_quantity_check;
ALTER TABLE public.crew_jobs ADD CONSTRAINT crew_jobs_quantity_check CHECK (quantity IS NULL OR (quantity >= 1 AND quantity <= 999));
NOTIFY pgrst, 'reload schema';
