import { NextRequest, NextResponse } from 'next/server';
import { guardPartnerAdmin } from '@/lib/dienvienvn/partner-admin';
import { CrewApplication } from '@/lib/dienvienvn/crew-profiles';
import { attachmentsFor } from '@/lib/dienvienvn/crew-files';

// ACT xem CV / cover letter đã nộp cho 1 tin tuyển ekip (?job_id=), link xem tạm 1 giờ. Trả về theo mã lượt ứng tuyển.
export async function GET(req: NextRequest) {
  const g = await guardPartnerAdmin(req);
  if ('res' in g) return g.res;
  const jobId = req.nextUrl.searchParams.get('job_id') || '';
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) return NextResponse.json({ error: 'Không tìm thấy tin.' }, { status: 404 });
  const { data } = await g.db.from('crew_applications').select('*').eq('job_id', jobId);
  const files = await attachmentsFor(g.db, (data || []) as CrewApplication[]).catch(() => new Map());
  return NextResponse.json({ attachments: Object.fromEntries(files) }, { headers: { 'Cache-Control': 'no-store' } });
}
