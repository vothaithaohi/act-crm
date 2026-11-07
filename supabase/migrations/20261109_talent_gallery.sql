-- Ảnh cá nhân thêm của diễn viên (ngoài 3 ảnh chân dung / toàn thân / góc nghiêng): tối đa 6 ảnh,
-- mỗi ảnh có chú thích. Dạng: [{"url": "https://...", "caption": "Phim Mai (2024) — vai Linh"}]
ALTER TABLE public.talent_profiles ADD COLUMN IF NOT EXISTS gallery JSONB NOT NULL DEFAULT '[]'::jsonb;
NOTIFY pgrst, 'reload schema';
