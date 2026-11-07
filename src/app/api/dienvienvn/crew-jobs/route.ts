import { NextResponse } from 'next/server';
import { getServiceDb, MISCONFIGURED_MESSAGE } from '@/lib/projects/server';
import { CrewJob, crewJobActive, toPublicCrewJob } from '@/lib/dienvienvn/crew-jobs';

// Tin tuyển ekip đang mở (công khai): chỉ tin đã được DienVienVN duyệt và còn hạn.
export async function GET() {
  const { mode, db } = getServiceDb();
  if (mode === 'demo') return NextResponse.json({ mode: 'demo', jobs: [] });
  if (!db) return NextResponse.json({ error: MISCONFIGURED_MESSAGE }, { status: 500 });
  const { data, error } = await db.from('crew_jobs').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: 'Không tải được tin tuyển dụng.' }, { status: 500 });
  const jobs = ((data || []) as CrewJob[]).filter(crewJobActive).map(toPublicCrewJob);
  return NextResponse.json({ mode: 'live', jobs }, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } });
}
