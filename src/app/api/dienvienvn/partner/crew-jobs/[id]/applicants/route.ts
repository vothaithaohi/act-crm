import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { getPartner } from '@/lib/dienvienvn/partner-server';
import { CrewApplication, CrewProfile } from '@/lib/dienvienvn/crew-profiles';
import { toApplicantView } from '@/lib/dienvienvn/crew-server';

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// Đối tác xem ứng viên của tin mình đăng (chỉ hồ sơ ekip đã được DienVienVN duyệt).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo', job: null, applicants: [] });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });
  const partner = await getPartner(req, db);
  if (partner instanceof NextResponse) return partner;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Không tìm thấy tin tuyển dụng.' }, { status: 404 });
  const { data: job } = await db.from('crew_jobs').select('id,title,company,status').eq('id', id).eq('partner_id', partner.id).maybeSingle();
  if (!job) return NextResponse.json({ error: 'Không tìm thấy tin tuyển dụng.' }, { status: 404 });

  const { data: apps } = await db.from('crew_applications').select('*').eq('job_id', id).order('created_at', { ascending: false });
  const list = (apps || []) as CrewApplication[];
  const { data: profiles } = list.length
    ? await db.from('crew_profiles').select('*').in('id', list.map(a => a.crew_profile_id)).eq('review_status', 'approved')
    : { data: [] };
  const byId = new Map(((profiles || []) as CrewProfile[]).map(p => [p.id, p]));
  const applicants = list.filter(a => byId.has(a.crew_profile_id)).map(a => toApplicantView(byId.get(a.crew_profile_id) as CrewProfile, a.created_at));
  return NextResponse.json({ mode: 'live', job, applicants }, { headers: { 'Cache-Control': 'no-store' } });
}
