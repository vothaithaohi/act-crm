import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Chặn API nội bộ CRM: yêu cầu header "Authorization: Bearer <access token Supabase>"
 * của một nhân sự đang hoạt động trong bảng profiles.
 * Chế độ demo (chưa cấu hình Supabase) cho qua để chạy thử.
 */
export async function requireStaff(req: NextRequest): Promise<NextResponse | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
  }

  const { data, error } = await supabase.auth.getUser(token);
  const email = data?.user?.email;
  if (error || !email) {
    return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ.' }, { status: 401 });
  }

  const { data: profiles } = await supabase.from('profiles').select('status').ilike('email', email).limit(1);
  if (!profiles || profiles.length === 0 || profiles[0].status !== 'active') {
    return NextResponse.json({ error: 'Tài khoản không có quyền truy cập.' }, { status: 403 });
  }
  return null;
}
