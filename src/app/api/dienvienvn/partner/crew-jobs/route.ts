import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { getPartner } from '@/lib/dienvienvn/partner-server';
import { isRateLimited } from '@/lib/dienvienvn/rate-limit';
import { CrewJob, crewJobSchema, toCrewJobColumns } from '@/lib/dienvienvn/crew-jobs';

const MISSING = 'Hệ thống chưa sẵn sàng (cần chạy migration 20261109_crew_jobs.sql và 20261113_crew_jobs_form_a.sql).';

// Tin tuyển ekip do đối tác đăng: xem danh sách của mình, đăng tin mới (luôn chờ DienVienVN duyệt).
export async function GET(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo', jobs: [] });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });
  const partner = await getPartner(req, db);
  if (partner instanceof NextResponse) return partner;
  const { data, error } = await db.from('crew_jobs').select('*').eq('partner_id', partner.id).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: MISSING }, { status: 500 });
  return NextResponse.json({ mode: 'live', jobs: (data || []) as CrewJob[], company: partner.company || '' }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo' });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });
  const partner = await getPartner(req, db);
  if (partner instanceof NextResponse) return partner;
  if (isRateLimited(`partner-crew:${partner.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Bạn đã đăng quá nhiều tin trong 1 giờ. Vui lòng thử lại sau.' }, { status: 429 });
  }
  const parsed = crewJobSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Thông tin chưa hợp lệ.' }, { status: 400 });

  const { data, error } = await db
    .from('crew_jobs')
    .insert({
      ...toCrewJobColumns(parsed.data),
      partner_id: partner.id,
      status: 'draft',
      created_by: `Đối tác: ${partner.full_name}`
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: /crew_jobs|column/.test(error.message) ? MISSING : 'Không lưu được tin. Vui lòng thử lại.' }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
