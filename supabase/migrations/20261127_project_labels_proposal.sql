-- Task 60 + 61: nhãn dự án hiện trên trang công khai
--   source: nguồn dự án (act = ACT, community = cộng đồng, partner = đối tác)
--   casting_mode: hình thức casting (online, offline, hybrid = cả online và offline)
-- Task 59: đánh dấu ứng viên đã đưa vào slide đề xuất (proposal) gửi đối tác — chỉ nội bộ CRM.
-- Chạy lại nhiều lần vẫn an toàn.
ALTER TABLE public.casting_projects ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.casting_projects ADD COLUMN IF NOT EXISTS casting_mode TEXT;
ALTER TABLE public.casting_projects DROP CONSTRAINT IF EXISTS casting_projects_source_check;
ALTER TABLE public.casting_projects ADD CONSTRAINT casting_projects_source_check CHECK (source IS NULL OR source IN ('act', 'community', 'partner'));
ALTER TABLE public.casting_projects DROP CONSTRAINT IF EXISTS casting_projects_casting_mode_check;
ALTER TABLE public.casting_projects ADD CONSTRAINT casting_projects_casting_mode_check CHECK (casting_mode IS NULL OR casting_mode IN ('online', 'offline', 'hybrid'));
-- Dự án cũ: đối tác đăng → nguồn "Đối tác", còn lại → "ACT"
UPDATE public.casting_projects SET source = CASE WHEN partner_id IS NOT NULL THEN 'partner' ELSE 'act' END WHERE source IS NULL;

ALTER TABLE public.project_applications ADD COLUMN IF NOT EXISTS in_proposal BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.project_applications ADD COLUMN IF NOT EXISTS proposal_added_at TIMESTAMPTZ;
ALTER TABLE public.project_applications ADD COLUMN IF NOT EXISTS proposal_added_by TEXT;
CREATE INDEX IF NOT EXISTS idx_project_applications_proposal ON public.project_applications (project_id) WHERE in_proposal;

NOTIFY pgrst, 'reload schema';
