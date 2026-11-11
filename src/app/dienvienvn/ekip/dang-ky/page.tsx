import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CrewSignup } from '@/components/dienvienvn/crew-apply';

export const metadata: Metadata = {
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
