import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CrewSignup } from '@/components/dienvienvn/crew-apply';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

const META: Metadata = {
  title: 'Đăng ký tài khoản ekip — DienVienVN',
  description: 'Ekip làm phim, quảng cáo, MV đăng ký tài khoản để lưu CV và ứng tuyển việc làm ekip trên DienVienVN.'
};

export default function CrewSignupPage() {
  return (
    <Suspense>
      <CrewSignup />
    </Suspense>
  );
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
