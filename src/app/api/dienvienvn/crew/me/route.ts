import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { CrewApplication, crewProfileSchema, toCrewProfileColumns } from '@/lib/dienvienvn/crew-profiles';
import { CREW_MISSING, getCrewUser, isMissingTable } from '@/lib/dienvienvn/crew-server';
import { CrewJob, crewJobActive } from '@/lib/dienvienvn/crew-jobs';

// Tài khoản ekip: xem hồ sơ + các tin đã ứng tuyển; sửa hồ sơ.
export async function GET(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo', crew: null });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });
  const who = await getCrewUser(req, db);
  if (who instanceof NextResponse) return who;
  if (!who.crew) return NextResponse.json({ mode: 'live', crew: null, email: who.user.email || '' }, { headers: { 'Cache-Control': 'no-store' } });

  const { data: apps, error } = await db.from('crew_applications').select('*').eq('crew_profile_id', who.crew.id).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: isMissingTable(error) ? CREW_MISSING : 'Không tải được dữ liệu.' }, { status: 500 });
  const list = (apps || []) as CrewApplication[];
  const { data: jobs } = list.length ? await db.from('crew_jobs').select('*').in('id', list.map(a => a.job_id)) : { data: [] };
  const byId = new Map(((jobs || []) as CrewJob[]).map(j => [j.id, j]));
  const applications = list.map(a => {
    const j = byId.get(a.job_id);
    return { id: a.id, job_id: a.job_id, created_at: a.created_at, title: j?.title || 'Tin đã xoá', company: j?.company || '', open: !!j && crewJobActive(j) };
  });
  return NextResponse.json({ mode: 'live', crew: who.crew, applications }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });
  const who = await getCrewUser(req, db);
  if (who instanceof NextResponse) return who;
  if (!who.crew) return NextResponse.json({ error: 'Bạn chưa có hồ sơ ekip.' }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { profile?: Record<string, unknown> } | null;
  // Email công việc là email đăng nhập: không đổi ở đây
  const parsed = crewProfileSchema.safeParse({ ...(body?.profile || {}), public_email: who.crew.public_email });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Thông tin hồ sơ chưa hợp lệ.' }, { status: 400 });
  const { public_email: _e, ...cols } = toCrewProfileColumns(parsed.data);
  void _e;
  // Hồ sơ bị từ chối được sửa lại thì chờ ACT duyệt lại
  const review = who.crew.review_status === 'rejected' ? { review_status: 'pending', reviewed_at: null } : {};
  const { data, error } = await db
    .from('crew_profiles')
    .update({ ...cols, ...review, updated_at: new Date().toISOString() })
    .eq('id', who.crew.id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'Không lưu được hồ sơ. Vui lòng thử lại.' }, { status: 500 });
  return NextResponse.json({ crew: data });
}
