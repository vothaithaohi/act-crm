-- Task 53: NSX đánh dấu ứng viên ngay trên link shortlist / cổng đối tác (Chọn / Cân nhắc / Loại).
-- ACT xem lại trong CRM (trang dự án). Chạy lại vẫn an toàn.
ALTER TABLE public.project_applications ADD COLUMN IF NOT EXISTS producer_decision TEXT;
ALTER TABLE public.project_applications ADD COLUMN IF NOT EXISTS producer_decided_at TIMESTAMPTZ;
ALTER TABLE public.project_applications DROP CONSTRAINT IF EXISTS project_applications_producer_decision_check;
ALTER TABLE public.project_applications
  ADD CONSTRAINT project_applications_producer_decision_check CHECK (producer_decision IS NULL OR producer_decision IN ('pick', 'maybe', 'reject'));
NOTIFY pgrst, 'reload schema';
