-- Bảo mật link shortlist (link NSX) và nhật ký xem của đối tác.

-- 1) Hạn dùng của link shortlist: tạo / gia hạn link mới có hiệu lực 30 ngày.
--    Link đang dùng được cho thêm 30 ngày kể từ khi chạy migration này (không bị tắt ngay).
ALTER TABLE public.casting_projects ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ;
ALTER TABLE public.casting_projects ALTER COLUMN share_expires_at SET DEFAULT now() + interval '30 days';
UPDATE public.casting_projects SET share_expires_at = now() + interval '30 days' WHERE share_expires_at IS NULL;

-- 2) Nhật ký: đối tác nào đã xem dự án / hồ sơ diễn viên nào (chỉ nhân sự CRM đọc được).
CREATE TABLE IF NOT EXISTS public.partner_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.casting_projects(id) ON DELETE CASCADE,
  talent_id UUID,
  source TEXT NOT NULL DEFAULT 'shortlist',
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_views_partner ON public.partner_views (partner_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_views_talent ON public.partner_views (talent_id);

ALTER TABLE public.partner_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_read_partner_views ON public.partner_views;
CREATE POLICY staff_read_partner_views ON public.partner_views FOR SELECT TO authenticated USING (public.is_staff());
REVOKE ALL ON public.partner_views FROM anon;

NOTIFY pgrst, 'reload schema';
