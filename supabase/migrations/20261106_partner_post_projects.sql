-- ==============================================================================
-- ĐỐI TÁC TỰ ĐĂNG CASTING CALL
-- Dự án do đối tác tạo trong cổng dienvienvn.com/doi-tac có partner_id. Dự án mới luôn ở trạng thái
-- "Nháp" (chờ ACT duyệt): chỉ hiện cho diễn viên sau khi nhân sự CRM chuyển sang "Đang casting".
-- Chạy trong Supabase SQL Editor. Chạy lại nhiều lần vẫn an toàn.
-- ==============================================================================

ALTER TABLE public.casting_projects
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partner_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_casting_projects_partner ON public.casting_projects(partner_id);

NOTIFY pgrst, 'reload schema';
