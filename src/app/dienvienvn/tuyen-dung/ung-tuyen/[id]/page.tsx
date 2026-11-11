import type { Metadata } from 'next';
import { CrewApply } from '@/components/dienvienvn/crew-apply';
import { getServiceDb } from '@/lib/projects/server';
import { CrewJob, crewJobActive, toPublicCrewJob } from '@/lib/dienvienvn/crew-jobs';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Ứng tuyển — Việc làm ekip DienVienVN', robots: { index: false, follow: false } };

export default async function CrewApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = getServiceDb();
  let job: ReturnType<typeof toPublicCrewJob> | null = null;
  if (db && /^[0-9a-f-]{36}$/i.test(id)) {
    const { data } = await db.from('crew_jobs').select('*').eq('id', id).maybeSingle();
    if (data && crewJobActive(data as CrewJob)) job = toPublicCrewJob(data as CrewJob);
  }
  return <CrewApply job={job} />;
}
