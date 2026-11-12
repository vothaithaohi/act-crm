import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { CrewApply } from '@/components/dienvienvn/crew-apply';
import { getServiceDb } from '@/lib/projects/server';
import { CrewJob, crewJobActive, crewJobPath, toPublicCrewJob } from '@/lib/dienvienvn/crew-jobs';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Ứng tuyển — Việc làm ekip DienVienVN', robots: { index: false, follow: false } };

// Link cũ theo id (VD: đã gửi qua Zalo / email): tin có mã ngắn thì chuyển sang link gọn /ekip/<tên>-<mã>.
export default async function CrewApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = getServiceDb();
  let job: CrewJob | null = null;
  if (db && /^[0-9a-f-]{36}$/i.test(id)) {
    const { data } = await db.from('crew_jobs').select('*').eq('id', id).maybeSingle();
    job = (data as CrewJob) || null;
  }
  if (job?.short_code) permanentRedirect(`${(await headers()).get('x-dienvienvn-base') ?? '/dienvienvn'}${crewJobPath(job)}`);
  return <CrewApply job={job && crewJobActive(job) ? toPublicCrewJob(job) : null} />;
}
