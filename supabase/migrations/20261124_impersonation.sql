-- Giả lập tài khoản người dùng (chỉ Super Admin): xem & thao tác như 1 tài khoản diễn viên / đối tác / ekip trên dienvienvn.com.
-- Mỗi phiên lưu ai giả lập ai, lúc nào, kết thúc lúc nào → nhật ký + nhận biết dữ liệu tạo ra trong lúc giả lập (đánh dấu TEST trong CRM).
-- Chỉ máy chủ (service role) đọc / ghi; nhân sự CRM chỉ xem. Chạy lại nhiều lần vẫn an toàn.
CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID,
  admin_email TEXT NOT NULL,
  target_user_id UUID NOT NULL,
  target_kind TEXT NOT NULL CHECK (target_kind IN ('actor', 'partner', 'crew')),
  target_label TEXT,
  -- Mã dùng 1 lần trong link mở tab (lưu dạng băm), hết hạn sau 2 phút
  code_hash TEXT,
  code_expires_at TIMESTAMPTZ,
  code_used_at TIMESTAMPTZ,
  -- Mã phiên trên trình duyệt (lưu dạng băm)
  token_hash TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_impersonation_admin ON public.impersonation_sessions (admin_email, ended_at);
CREATE INDEX IF NOT EXISTS idx_impersonation_target ON public.impersonation_sessions (target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_code ON public.impersonation_sessions (code_hash);

ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_read_impersonation ON public.impersonation_sessions;
CREATE POLICY staff_read_impersonation ON public.impersonation_sessions FOR SELECT TO authenticated USING (public.is_staff());
REVOKE ALL ON public.impersonation_sessions FROM anon;

NOTIFY pgrst, 'reload schema';
