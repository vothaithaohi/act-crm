import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { isStaffEmail, isSuperAdminUser } from '@/lib/dienvienvn/actor-server';
import { clientIp, isRateLimited } from '@/lib/dienvienvn/rate-limit';
import { CrewProfile, crewProfileSchema, toCrewProfileColumns } from '@/lib/dienvienvn/crew-profiles';
import { CREW_MISSING, findCrewByEmail, getCrewUser, isMissingTable } from '@/lib/dienvienvn/crew-server';

// Tạo hồ sơ ekip (Form B) cho tài khoản đang đăng nhập (đã xác nhận email & tạo mật khẩu).
// Hồ sơ hoạt động ngay (không chờ ACT duyệt); ACT khoá được trong CRM.
export async function POST(req: NextRequest) {
  if (isRateLimited(`crew-profile:${clientIp(req.headers)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau 1 giờ.' }, { status: 429 });
  }
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo', ok: true });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const body = (await req.json().catch(() => null)) as { profile?: unknown; website?: string } | null;
  if (body?.website) return NextResponse.json({ ok: true });
  const parsed = crewProfileSchema.safeParse(body?.profile);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Thông tin hồ sơ chưa hợp lệ.' }, { status: 400 });
  const input = parsed.data;

  // Phải đăng nhập: email đăng nhập là email công việc của hồ sơ
  const who = await getCrewUser(req, db);
  if (who instanceof NextResponse) return who;
  if (who.crew) return NextResponse.json({ error: 'Tài khoản này đã có hồ sơ ekip.', exists: true }, { status: 409 });
  const userId = who.user.id;
  const superAdmin = await isSuperAdminUser(db, who.user);
  input.public_email = (who.user.email || input.public_email).trim().toLowerCase();

  // Super Admin đang đăng nhập được dùng email nhân sự để test (hồ sơ tự duyệt)
  if (!superAdmin && (await isStaffEmail(db, input.public_email))) {
    return NextResponse.json({ error: 'Email này thuộc nhân sự DienVienVN. Vui lòng dùng email khác.' }, { status: 400 });
  }
  if (await findCrewByEmail(db, input.public_email)) {
    return NextResponse.json({ error: 'Email này đã có hồ sơ ekip.', exists: true }, { status: 409 });
  }

  const { data, error } = await db
    .from('crew_profiles')
    .insert({ ...toCrewProfileColumns(input), auth_user_id: userId, review_status: 'approved', reviewed_at: new Date().toISOString() })
    .select('*')
    .single();
  if (error || !data) {
    if (error?.code === '23505') return NextResponse.json({ error: 'Email này đã có hồ sơ ekip.', exists: true }, { status: 409 });
    console.error('[dienvienvn] Tạo hồ sơ ekip lỗi:', error?.message);
    return NextResponse.json({ error: isMissingTable(error) ? CREW_MISSING : 'Không lưu được hồ sơ. Vui lòng thử lại.' }, { status: 500 });
  }
  const crew = data as CrewProfile;

  return NextResponse.json({ ok: true, id: crew.id, crew });
}
