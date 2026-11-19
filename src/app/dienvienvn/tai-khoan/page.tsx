import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ActorAccount } from '@/components/dienvienvn/actor-pages';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

const META: Metadata = {
  title: 'Tài khoản — DienVienVN',
  robots: { index: false, follow: false }
};

export default function AccountPage() {
  return (
    <Suspense>
      <ActorAccount />
    </Suspense>
  );
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
