import type { Metadata } from 'next';
import { SetPassword } from '@/components/dienvienvn/actor-pages';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

const META: Metadata = {
  title: 'Tạo mật khẩu — DienVienVN',
  robots: { index: false, follow: false }
};

export default function SetPasswordPage() {
  return <SetPassword />;
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
