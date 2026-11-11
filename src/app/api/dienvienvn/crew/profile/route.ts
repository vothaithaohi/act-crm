import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { isStaffEmail, isSuperAdminUser } from '@/lib/dienvienvn/actor-server';
import { clientIp, isRateLimited } from '@/lib/dienvienvn/rate-limit';
import { CV_REQUIRED_MESSAGE, CrewProfile, crewHasCv, crewProfileSchema, toCrewProfileColumns } from '@/lib/dienvienvn/crew-profiles';
import {
  CREW_MISSING,
  applyCrewToJob,
  findCrewByEmail,
  getCrewUser,
  isMissingTable,
  openJob,
  sendCrewAccountEmail
} from '@/lib/dienvienvn/crew-server';

// Tạo hồ sơ ekip (Form B) khi bấm "Ứng tuyển" lần đầu; kèm job_id thì ứng tuyển luôn tin đó.
// Chưa đăng nhập: gửi email xác thực & tạo mật khẩu. Hồ sơ ở trạng thái "Chờ duyệt" cho tới khi ACT duyệt.
export async function POST(req: NextRequest) {
  if (isRateLimited(`crew-profile:${clientIp(req.headers)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau 1 giờ.' }, { status: 429 });
  }
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo', ok: true });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });

  const body = (await req.json().catch(() => null)) as { profile?: unknown; job_id?: string; website?: string } | null;
  if (body?.website) return NextResponse.json({ ok: true });
  const parsed = crewProfileSchema.safeParse(body?.profile);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Thông tin hồ sơ chưa hợp lệ.' }, { status: 400 });
  const input = parsed.data;

  // Đang đăng nhập (VD: diễn viên đã có tài khoản): gắn hồ sơ vào tài khoản này, không cần email
  let userId: string | null = null;
  let superAdmin = false;
  if (req.headers.get('authorization')) {
    const who = await getCrewUser(req, db);
    if (who instanceof NextResponse) return who;
    if (who.crew) return NextResponse.json({ error: 'Tài khoản này đã có hồ sơ ekip.', exists: true }, { status: 409 });
    userId = who.user.id;
    superAdmin = await isSuperAdminUser(db, who.user);
  }

  // Super Admin đang đăng nhập được dùng email nhân sự để test (hồ sơ tự duyệt)
  if (!superAdmin && (await isStaffEmail(db, input.public_email))) {
    return NextResponse.json({ error: 'Email này thuộc nhân sự DienVienVN. Vui lòng dùng email khác.' }, { status: 400 });
  }
  // Tin yêu cầu CV / portfolio: kiểm tra trước khi tạo hồ sơ
  const jobForCv = body?.job_id ? await openJob(db, body.job_id) : null;
  if (jobForCv?.requires_cv && !crewHasCv(input)) return NextResponse.json({ error: CV_REQUIRED_MESSAGE, field: 'cv_url' }, { status: 400 });

  if (await findCrewByEmail(db, input.public_email)) {
    return NextResponse.json({ error: 'Email này đã có hồ sơ ekip. Vui lòng đăng nhập để ứng tuyển.', exists: true }, { status: 409 });
  }

  const { data, error } = await db
    .from('crew_profiles')
    .insert({ ...toCrewProfileColumns(input), auth_user_id: userId, review_status: superAdmin ? 'approved' : 'pending' })
    .select('*')
    .single();
  if (error || !data) {
    if (error?.code === '23505') return NextResponse.json({ error: 'Email này đã có hồ sơ ekip. Vui lòng đăng nhập để ứng tuyển.', exists: true }, { status: 409 });
    console.error('[dienvienvn] Tạo hồ sơ ekip lỗi:', error?.message);
    return NextResponse.json({ error: isMissingTable(error) ? CREW_MISSING : 'Không lưu được hồ sơ. Vui lòng thử lại.' }, { status: 500 });
  }
  const crew = data as CrewProfile;

  const email = userId ? null : await sendCrewAccountEmail(db, crew, req.headers);
  let applied: 'applied' | 'already' | 'failed' | 'closed' | null = null;
  if (body?.job_id) {
    const job = await openJob(db, body.job_id);
    applied = job ? await applyCrewToJob(db, crew, job, req.headers) : 'closed';
  }
  return NextResponse.json({ ok: true, id: crew.id, applied, email });
}
