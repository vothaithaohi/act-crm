import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CastingApplication } from '@/components/dienvienvn/casting-application';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

const META: Metadata = {
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

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
