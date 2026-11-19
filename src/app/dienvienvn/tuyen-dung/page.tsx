import type { Metadata } from 'next';
import { CrewJobBoard } from '@/components/dienvienvn/crew-jobs';
import { getServiceDb } from '@/lib/projects/server';
import { CrewJob, crewJobActive, toPublicCrewJob } from '@/lib/dienvienvn/crew-jobs';
import { SITE_URL } from '@/lib/dienvienvn/hosts';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

export const revalidate = 300;

const META: Metadata = {
  title: 'Tuyển dụng ekip — DienVienVN',
  description: 'Tin tuyển ekip làm phim, audition, quảng cáo: trợ lý casting, quay phim, ánh sáng, trang điểm… trên DienVienVN.',
  alternates: { canonical: `${SITE_URL}/tuyen-dung` }
};

export default async function CrewJobsPage() {
  const { db } = getServiceDb();
  let jobs: ReturnType<typeof toPublicCrewJob>[] = [];
  if (db) {
    const { data } = await db.from('crew_jobs').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(200);
    jobs = ((data || []) as CrewJob[]).filter(crewJobActive).map(toPublicCrewJob);
  }
  return <CrewJobBoard jobs={jobs} />;
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
