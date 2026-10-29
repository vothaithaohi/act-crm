-- ==============================================================================
-- TÀI KHOẢN DIỄN VIÊN DIENVIENVN
-- Mỗi hồ sơ casting gắn với một tài khoản Supabase Auth (tạo qua email mời sau khi
-- nộp hồ sơ). Diễn viên KHÔNG đọc/ghi bảng trực tiếp — mọi thao tác đi qua API server
-- (service role) sau khi xác minh access token, nên không cần thêm chính sách RLS.
-- Tài khoản diễn viên không có dòng trong bảng profiles => không vào được CRM.
-- Chạy trong Supabase SQL Editor. Chạy lại nhiều lần vẫn an toàn.
-- ==============================================================================

ALTER TABLE public.talent_profiles
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_talent_auth_user_id
  ON public.talent_profiles(auth_user_id) WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_talent_email_lower ON public.talent_profiles(lower(email));

NOTIFY pgrst, 'reload schema';
