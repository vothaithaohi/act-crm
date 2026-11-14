import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ImpersonationStart } from '@/components/dienvienvn/impersonation-bar';

export const metadata: Metadata = {
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
