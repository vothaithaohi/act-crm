import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CrewApply } from '@/components/dienvienvn/crew-apply';
import { getServiceDb } from '@/lib/projects/server';
import { CrewJob, crewJobActive, crewJobCodeFromParam, toPublicCrewJob } from '@/lib/dienvienvn/crew-jobs';
import { roleLabel } from '@/lib/dienvienvn/crew-taxonomy';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

export const dynamic = 'force-dynamic';

// Link gọn của tin tuyển ekip: /ekip/<tên-vị-trí>-<mã 6 ký tự>. Chỉ mã sau dấu "-" cuối cùng được kiểm tra.
async function findJob(slug: string): Promise<CrewJob | null> {
  const code = crewJobCodeFromParam(slug);
  if (!/^[0-9a-z]{4,12}$/.test(code)) return null;
  const { db } = getServiceDb();
  if (!db) return null;
  const { data } = await db.from('crew_jobs').select('*').eq('short_code', code).maybeSingle();
  return (data as CrewJob) || null;
}

async function baseMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const job = await findJob((await params).slug);
  const role = job ? roleLabel(job.department, job.role_title, job.role_other)?.vi || job.title : '';
  return { title: role ? `${role}${job?.company ? ` · ${job.company}` : ''} — Việc làm ekip DienVienVN` : 'Ứng tuyển — Việc làm ekip DienVienVN', robots: { index: false, follow: false } };
}

export default async function CrewJobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { db } = getServiceDb();
  const job = db ? await findJob(slug) : null;
  if (db && !job && !/-?[0-9a-z]{4,12}$/.test(slug)) notFound();
  return <CrewApply job={job && crewJobActive(job) ? toPublicCrewJob(job) : null} />;
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = async (...a: Parameters<typeof baseMetadata>) => localizeMetadata(await baseMetadata(...a));
