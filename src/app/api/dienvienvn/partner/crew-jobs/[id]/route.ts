import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { getPartner } from '@/lib/dienvienvn/partner-server';
import { CrewJob, crewJobSchema, toCrewJobColumns } from '@/lib/dienvienvn/crew-jobs';

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const NOT_FOUND = 'Không tìm thấy tin tuyển dụng.';

async function ownJob(req: NextRequest, id: string) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return { res: NextResponse.json({ mode: 'demo' }) };
  if (!db) return { res: NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 }) };
  const partner = await getPartner(req, db);
  if (partner instanceof NextResponse) return { res: partner };
  if (!isUuid(id)) return { res: NextResponse.json({ error: NOT_FOUND }, { status: 404 }) };
  const { data } = await db.from('crew_jobs').select('*').eq('id', id).eq('partner_id', partner.id).maybeSingle();
  if (!data) return { res: NextResponse.json({ error: NOT_FOUND }, { status: 404 }) };
  return { db, job: data as CrewJob };
}

// Đối tác xem 1 tin của mình (để sửa)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const r = await ownJob(req, (await params).id);
  if ('res' in r) return r.res;
  return NextResponse.json({ mode: 'live', job: r.job, editable: r.job.status === 'draft' }, { headers: { 'Cache-Control': 'no-store' } });
}

// Đối tác sửa tin của mình khi còn chờ duyệt
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const r = await ownJob(req, (await params).id);
  if ('res' in r) return r.res;
  if (r.job.status !== 'draft') {
    return NextResponse.json({ error: 'Tin đã được duyệt. Vui lòng liên hệ DienVienVN để chỉnh sửa.' }, { status: 409 });
  }
  const parsed = crewJobSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Thông tin chưa hợp lệ.' }, { status: 400 });
  const { error } = await r.db
    .from('crew_jobs')
    .update({ ...toCrewJobColumns(parsed.data), updated_at: new Date().toISOString() })
    .eq('id', r.job.id);
  if (error) return NextResponse.json({ error: /column/.test(error.message) ? 'Hệ thống chưa sẵn sàng (cần chạy migration 20261113_crew_jobs_form_a.sql).' : 'Không lưu được tin. Vui lòng thử lại.' }, { status: 500 });
  return NextResponse.json({ id: r.job.id });
}
