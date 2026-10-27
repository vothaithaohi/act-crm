-- ==============================================================================
-- GẮN ĐỐI TÁC VỚI DỰ ÁN CASTING
-- Đối tác (đạo diễn, nhà sản xuất…) xem được danh sách ứng viên của các dự án được gắn
-- ngay trong cổng dienvienvn.com/doi-tac, bên cạnh kho diễn viên đã duyệt.
-- Chạy trong Supabase SQL Editor. Chạy lại nhiều lần vẫn an toàn.
-- ==============================================================================

ALTER TABLE public.partner_accounts
  ADD COLUMN IF NOT EXISTS project_ids UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_partner_accounts_project_ids ON public.partner_accounts USING GIN (project_ids);

NOTIFY pgrst, 'reload schema';
