import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ActorLogin } from '@/components/dienvienvn/actor-pages';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

const META: Metadata = {
  title: 'Đăng nhập — DienVienVN',
  robots: { index: false, follow: false }
};

export default function LoginPage() {
  return (
    <Suspense>
      <ActorLogin />
    </Suspense>
  );
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
