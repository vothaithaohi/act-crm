-- Vai trò "Chỉ xem" (viewer) cho CRM: xem được, KHÔNG tạo / sửa / xoá.
-- Ngoài việc ẩn nút trên giao diện, cơ sở dữ liệu chặn mọi thao tác ghi của vai trò này.
-- Chạy lại nhiều lần vẫn an toàn. Chạy lại file này nếu sau này có thêm bảng mới.

-- 1. Cho phép giá trị role = 'viewer'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'sales', 'marketing', 'casting', 'developer', 'viewer', 'admin', 'staff', 'student'));

-- 2. Người đang đăng nhập có phải nhân sự "Chỉ xem" không
CREATE OR REPLACE FUNCTION public.is_viewer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND p.role = 'viewer'
  );
$$;
REVOKE ALL ON FUNCTION public.is_viewer() FROM public;
GRANT EXECUTE ON FUNCTION public.is_viewer() TO authenticated;

-- 3. Chặn ghi: thêm policy RESTRICTIVE (bắt buộc thoả cùng các policy hiện có) cho INSERT / UPDATE / DELETE
--    trên mọi bảng đang bật RLS trong schema public. Quyền đọc giữ nguyên.
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS viewer_no_insert ON public.%I', t.tablename);
    EXECUTE format('DROP POLICY IF EXISTS viewer_no_update ON public.%I', t.tablename);
    EXECUTE format('DROP POLICY IF EXISTS viewer_no_delete ON public.%I', t.tablename);
    EXECUTE format('CREATE POLICY viewer_no_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_viewer())', t.tablename);
    EXECUTE format('CREATE POLICY viewer_no_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_viewer()) WITH CHECK (NOT public.is_viewer())', t.tablename);
    EXECUTE format('CREATE POLICY viewer_no_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.is_viewer())', t.tablename);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
