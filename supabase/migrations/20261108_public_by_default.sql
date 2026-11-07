-- Hồ sơ diễn viên được duyệt sẽ hiển thị công khai trên dienvienvn.com (quyết định của ACT ngày 07/11/2026).
-- Diễn viên tự ẩn được trong trang tài khoản (public_profile = false).
-- Chỉ bật công khai hàng loạt MỘT LẦN (khi mặc định còn là false); chạy lại không ghi đè người đã tự ẩn.
DO $$
BEGIN
  IF (SELECT column_default FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'talent_profiles' AND column_name = 'public_profile') = 'false' THEN
    UPDATE public.talent_profiles SET public_profile = true WHERE public_profile IS DISTINCT FROM true;
    ALTER TABLE public.talent_profiles ALTER COLUMN public_profile SET DEFAULT true;
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';
