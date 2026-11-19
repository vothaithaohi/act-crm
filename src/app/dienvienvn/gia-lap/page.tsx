import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ImpersonationStart } from '@/components/dienvienvn/impersonation-bar';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

const META: Metadata = {
  title: 'Giả lập tài khoản — DienVienVN',
  robots: { index: false, follow: false }
};

export default function ImpersonationPage() {
  return (
    <Suspense>
      <ImpersonationStart />
    </Suspense>
  );
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
