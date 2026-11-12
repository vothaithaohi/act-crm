import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { CrewApplication, crewProfileSchema, toCrewProfileColumns } from '@/lib/dienvienvn/crew-profiles';
import { CREW_MISSING, getCrewUser, isMissingTable } from '@/lib/dienvienvn/crew-server';
import { CrewJob, crewJobActive, toPublicCrewJob } from '@/lib/dienvienvn/crew-jobs';
import { attachmentsFor, listFiles } from '@/lib/dienvienvn/crew-files';

// Tài khoản ekip: hồ sơ, kho CV, các tin đã ứng tuyển (kèm CV / cover letter đã nộp); sửa hồ sơ.
export async function GET(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo', crew: null });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });
  const who = await getCrewUser(req, db);
  if (who instanceof NextResponse) return who;
  // Chưa có hồ sơ: vẫn trả kho file (tải CV / cover letter được ngay sau khi tạo mật khẩu)
  if (!who.crew) {
    const lib = await listFiles(db, who.user.id, null).catch(() => ({ cvs: [], covers: [] }));
    return NextResponse.json({ mode: 'live', crew: null, email: who.user.email || '', ...lib }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const { data: apps, error } = await db.from('crew_applications').select('*').eq('crew_profile_id', who.crew.id).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: isMissingTable(error) ? CREW_MISSING : 'Không tải được dữ liệu.' }, { status: 500 });
  const list = (apps || []) as CrewApplication[];
  const { data: jobs } = list.length ? await db.from('crew_jobs').select('*').in('id', list.map(a => a.job_id)) : { data: [] };
  const byId = new Map(((jobs || []) as CrewJob[]).map(j => [j.id, j]));
  // Bảng kho CV có thể chưa có (chưa chạy migration 20261118) → vẫn trả hồ sơ
  const [lib, files] = await Promise.all([listFiles(db, who.user.id, who.crew.id).catch(() => ({ cvs: [], covers: [] })), attachmentsFor(db, list).catch(() => new Map())]);
  const applications = list.map(a => {
    const j = byId.get(a.job_id);
    return {
      id: a.id,
      job_id: a.job_id,
      created_at: a.created_at,
      title: j?.title || 'Tin đã xoá',
      company: j?.company || '',
      open: !!j && crewJobActive(j),
      ...(files.get(a.id) || { cv: null, cover_letter: null, cover_letter_url: null })
    };
  });
  // Việc làm đang tuyển mà tài khoản chưa ứng tuyển (hiện ngay trên trang tài khoản)
  const applied = new Set(list.map(a => a.job_id));
  const { data: openRows } = await db.from('crew_jobs').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(100);
  const open_jobs = ((openRows || []) as CrewJob[]).filter(j => crewJobActive(j) && !applied.has(j.id)).map(toPublicCrewJob);
  return NextResponse.json({ mode: 'live', crew: who.crew, ...lib, applications, open_jobs }, { headers: { 'Cache-Control': 'no-store' } });
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
  if (who.crew.review_status === 'rejected') return NextResponse.json({ error: 'Tài khoản ekip đang bị khoá. Vui lòng liên hệ DienVienVN.' }, { status: 403 });
  const { data, error } = await db
    .from('crew_profiles')
    .update({ ...cols, updated_at: new Date().toISOString() })
    .eq('id', who.crew.id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'Không lưu được hồ sơ. Vui lòng thử lại.' }, { status: 500 });
  return NextResponse.json({ crew: data });
}
