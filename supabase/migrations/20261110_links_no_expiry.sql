-- Bỏ hạn 30 ngày của link shortlist (casting_projects) và link kho diễn viên (talent_catalog_links).
-- Link chỉ ngừng khi ACT bấm "Link mới" (shortlist) hoặc "Thu hồi" (kho). Chạy lại nhiều lần vẫn an toàn.
ALTER TABLE public.casting_projects ALTER COLUMN share_expires_at DROP DEFAULT;
UPDATE public.casting_projects SET share_expires_at = NULL WHERE share_expires_at IS NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.talent_catalog_links') IS NOT NULL THEN
    ALTER TABLE public.talent_catalog_links ALTER COLUMN expires_at DROP NOT NULL;
    ALTER TABLE public.talent_catalog_links ALTER COLUMN expires_at DROP DEFAULT;
    UPDATE public.talent_catalog_links SET expires_at = NULL WHERE expires_at IS NOT NULL;
  END IF;
END $$;
