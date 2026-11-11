-- Kho file ứng viên ekip v2: CV (PDF) + cover letter (viết tay hoặc PDF), gắn theo TÀI KHOẢN đăng nhập
-- (tải được ngay khi vừa tạo mật khẩu, trước khi lưu hồ sơ). Tối đa 5 CV + 5 cover letter / tài khoản (kiểm tra ở máy chủ).
-- File tải thẳng từ trình duyệt lên kho riêng tư crew-cv (không qua Vercel) → nhận PDF tới 10MB.
-- Chạy sau 20261118_crew_portal.sql. Chạy lại nhiều lần vẫn an toàn.

ALTER TABLE public.crew_cvs ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.crew_cvs ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'cv';
ALTER TABLE public.crew_cvs ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE public.crew_cvs ALTER COLUMN crew_profile_id DROP NOT NULL;

ALTER TABLE public.crew_cvs DROP CONSTRAINT IF EXISTS crew_cvs_check;
ALTER TABLE public.crew_cvs DROP CONSTRAINT IF EXISTS crew_cvs_kind_check;
ALTER TABLE public.crew_cvs ADD CONSTRAINT crew_cvs_kind_check CHECK (kind IN ('cv', 'cover'));
ALTER TABLE public.crew_cvs DROP CONSTRAINT IF EXISTS crew_cvs_content_check;
ALTER TABLE public.crew_cvs ADD CONSTRAINT crew_cvs_content_check CHECK (file_path IS NOT NULL OR link_url IS NOT NULL OR body IS NOT NULL);

-- CV đã có (gắn theo hồ sơ) → gắn thêm theo tài khoản
UPDATE public.crew_cvs c SET auth_user_id = p.auth_user_id
FROM public.crew_profiles p
WHERE c.crew_profile_id = p.id AND c.auth_user_id IS NULL AND p.auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crew_cvs_user ON public.crew_cvs (auth_user_id, kind, created_at);

-- Kho riêng tư: PDF tối đa 10MB
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('crew-cv', 'crew-cv', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760, allowed_mime_types = ARRAY['application/pdf'];

NOTIFY pgrst, 'reload schema';
