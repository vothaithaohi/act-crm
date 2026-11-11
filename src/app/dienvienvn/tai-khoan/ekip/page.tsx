import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CrewAccount } from '@/components/dienvienvn/crew-apply';

export const metadata: Metadata = { title: 'Tài khoản ekip — DienVienVN', robots: { index: false, follow: false } };

export default function CrewAccountPage() {
  return (
    <Suspense>
      <CrewAccount />
    </Suspense>
  );
}
