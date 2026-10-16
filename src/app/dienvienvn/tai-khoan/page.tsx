import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ActorAccount } from '@/components/dienvienvn/actor-pages';

export const metadata: Metadata = {
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
