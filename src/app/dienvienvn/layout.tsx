import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { BasePathProvider } from '@/components/dienvienvn/base-path';
import './dienvienvn.css';

export const metadata: Metadata = {
  title: 'DienVienVN — Đúng người. Đúng vai.',
  description:
    'DienVienVN kết nối diễn viên Việt với các nhà sản xuất đang casting. Chính thức ra mắt 11.11.2026 — cổng nộp hồ sơ casting đã mở.',
  openGraph: {
    title: 'DienVienVN — Đúng người. Đúng vai.',
    description: 'Chính thức ra mắt 11.11.2026. Nộp hồ sơ casting ngay hôm nay.',
    siteName: 'DienVienVN',
    locale: 'vi_VN',
    type: 'website'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000'
};

export default async function DienVienVNLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const base = h.get('x-dienvienvn-base') ?? '/dienvienvn';
  return (
    <BasePathProvider base={base}>
      <div className="dv-root">{children}</div>
    </BasePathProvider>
  );
}
