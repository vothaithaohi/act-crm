-- ACT khoá hiển thị công khai của hồ sơ diễn viên: khi khoá, hồ sơ bị ẩn khỏi dienvienvn.com và diễn viên không tự bật lại được.
-- Hồ sơ vẫn quản lý trong CRM, vẫn thêm vào dự án / link NSX (dùng cho hồ sơ người nổi tiếng gửi proposal).
-- Chạy lại nhiều lần vẫn an toàn.
ALTER TABLE public.talent_profiles ADD COLUMN IF NOT EXISTS public_locked BOOLEAN NOT NULL DEFAULT false;

-- Hồ sơ AI tạo đang ẩn: khoá luôn (chỉ bật công khai khi diễn viên / agency đồng ý)
UPDATE public.talent_profiles SET public_locked = true WHERE submission_source = 'ai' AND public_profile = false AND public_locked = false;

NOTIFY pgrst, 'reload schema';
