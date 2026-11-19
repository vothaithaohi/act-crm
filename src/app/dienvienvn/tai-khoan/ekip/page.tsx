import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CrewAccount } from '@/components/dienvienvn/crew-apply';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

const META: Metadata = { title: 'Tài khoản ekip — DienVienVN', robots: { index: false, follow: false } };

export default function CrewAccountPage() {
  return (
    <Suspense>
      <CrewAccount />
    </Suspense>
  );
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
