import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ActorLogin } from '@/components/dienvienvn/actor-pages';

export const metadata: Metadata = {
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
