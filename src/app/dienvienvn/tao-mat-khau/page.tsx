import type { Metadata } from 'next';
import { SetPassword } from '@/components/dienvienvn/actor-pages';

export const metadata: Metadata = {
  title: 'Tạo mật khẩu — DienVienVN',
  robots: { index: false, follow: false }
};

export default function SetPasswordPage() {
  return <SetPassword />;
}
