import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CastingApplication } from '@/components/dienvienvn/casting-application';

export const metadata: Metadata = {
  title: 'Nộp hồ sơ casting — DienVienVN',
  description: 'Nộp hồ sơ diễn viên trong 7 bước để được giới thiệu tới các dự án đang casting.'
};

export default function CastingApplicationPage() {
  return (
    <Suspense>
      <CastingApplication />
    </Suspense>
  );
}
