-- Task 33: một dự án tuyển nhiều vị trí, vị trí "Khác" tự nhập, yêu cầu gửi kèm portfolio/CV. Chạy lại nhiều lần vẫn an toàn.
-- Mỗi vị trí vẫn là một dòng crew_jobs (một tin trên trang tuyển dụng); các vị trí đăng cùng lần có chung group_id.
ALTER TABLE public.crew_jobs
  ADD COLUMN IF NOT EXISTS role_other TEXT,
  ADD COLUMN IF NOT EXISTS requires_cv BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_id UUID;
CREATE INDEX IF NOT EXISTS idx_crew_jobs_group ON public.crew_jobs (group_id);
