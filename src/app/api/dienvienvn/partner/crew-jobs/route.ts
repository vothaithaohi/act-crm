import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { getPartner } from '@/lib/dienvienvn/partner-server';
import { isRateLimited } from '@/lib/dienvienvn/rate-limit';
import { randomUUID } from 'crypto';
import { CrewJob, parseCrewJobBatch, toCrewJobColumns } from '@/lib/dienvienvn/crew-jobs';

const MISSING = 'Hệ thống chưa sẵn sàng (cần chạy migration 20261109_crew_jobs.sql, 20261113_crew_jobs_form_a.sql và 20261114_crew_jobs_multi_role.sql).';

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
  const parsed = parseCrewJobBatch(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // Một dự án nhiều vị trí: mỗi vị trí là một tin (chung group_id), cùng chờ DienVienVN duyệt
  const group_id = randomUUID();
  const { data, error } = await db
    .from('crew_jobs')
    .insert(
      parsed.inputs.map(input => ({
        ...toCrewJobColumns(input),
        group_id,
        partner_id: partner.id,
        status: 'draft',
        created_by: `Đối tác: ${partner.full_name}`
      }))
    )
    .select('id');
  if (error || !data?.length) {
    return NextResponse.json({ error: /crew_jobs|column/.test(error?.message || '') ? MISSING : 'Không lưu được tin. Vui lòng thử lại.' }, { status: 500 });
  }
  return NextResponse.json({ id: data[0].id, ids: data.map(d => d.id) });
}
