-- Task 49: link CV trong hồ sơ ekip (tin tuyển có tick "Yêu cầu gửi kèm portfolio/CV" sẽ yêu cầu CV hoặc portfolio). Chạy lại vẫn an toàn.
ALTER TABLE public.crew_profiles ADD COLUMN IF NOT EXISTS cv_url TEXT;
NOTIFY pgrst, 'reload schema';
