import type { Metadata } from 'next';
import { CrewJobBoard } from '@/components/dienvienvn/crew-jobs';
import { getServiceDb } from '@/lib/projects/server';
import { CrewJob, crewJobActive, toPublicCrewJob } from '@/lib/dienvienvn/crew-jobs';
import { SITE_URL } from '@/lib/dienvienvn/hosts';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Việc làm ekip — DienVienVN',
  description: 'Việc làm ekip làm phim, quảng cáo, MV: trợ lý casting, quay phim, ánh sáng, trang điểm… Tạo tài khoản ekip, lưu CV và ứng tuyển trên DienVienVN.',
  alternates: { canonical: `${SITE_URL}/ekip` }
};

// Dành cho ekip: cùng danh sách tin như /tuyen-dung, khung trên cùng dành cho ứng viên (đăng ký / hồ sơ ekip).
export default async function CrewPortalPage() {
  const { db } = getServiceDb();
  let jobs: ReturnType<typeof toPublicCrewJob>[] = [];
  if (db) {
    const { data } = await db.from('crew_jobs').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(200);
    jobs = ((data || []) as CrewJob[]).filter(crewJobActive).map(toPublicCrewJob);
  }
  return <CrewJobBoard jobs={jobs} variant="crew" />;
}
