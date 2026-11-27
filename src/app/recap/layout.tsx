import type { Metadata } from 'next';
import { RecapShell } from '@/components/recap/recap-shell';

export const metadata: Metadata = {
  title: 'Recap cuộc họp — DienVienVN',
  robots: { index: false, follow: false }
};

/** recap.dienvienvn.com: bóc băng + tóm tắt cuộc họp nội bộ (đăng nhập bằng tài khoản CRM). */
export default function RecapLayout({ children }: { children: React.ReactNode }) {
  return <RecapShell>{children}</RecapShell>;
}
