import type { Metadata } from 'next';
import { ProjectsSection } from '@/components/dienvienvn/projects-section';
import { GlobalNav, SiteFooter } from '@/components/dienvienvn/site-chrome';

export const metadata: Metadata = {
  title: 'Dự án đang casting — DienVienVN',
  description: 'Các dự án phim, quảng cáo, MV đang tìm diễn viên trên DienVienVN. Chọn vai phù hợp và ứng tuyển.'
};

export default function ProjectsPage() {
  return (
    <>
      <GlobalNav />
      <main className="min-h-[70vh]">
        <ProjectsSection page />
      </main>
      <SiteFooter />
    </>
  );
}
