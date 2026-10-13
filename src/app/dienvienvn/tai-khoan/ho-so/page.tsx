import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CastingApplication } from '@/components/dienvienvn/casting-application';

export const metadata: Metadata = {
  title: 'Chỉnh sửa hồ sơ — DienVienVN',
  robots: { index: false, follow: false }
};

export default function EditProfilePage() {
  return (
    <Suspense>
      <CastingApplication mode="edit" />
    </Suspense>
  );
}
