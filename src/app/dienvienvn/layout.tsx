import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import Script from 'next/script';
import { BasePathProvider } from '@/components/dienvienvn/base-path';
import { SITE_URL } from '@/lib/dienvienvn/hosts';
import './dienvienvn.css';

/** Google Analytics 4 của DienVienVN (chỉ chạy trên tên miền dienvienvn.com). */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-HSCCK5DSHP';

const TITLE = 'DienVienVN — Đúng người. Đúng vai.';
const DESCRIPTION =
  'DienVienVN kết nối diễn viên Việt với đạo diễn và nhà sản xuất đang casting. Chính thức ra mắt 11.11.2026 — cổng nộp hồ sơ diễn viên đã mở.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'DienVienVN',
  openGraph: {
    title: TITLE,
    description: 'Chính thức ra mắt 11.11.2026. Nộp hồ sơ diễn viên ngay hôm nay.',
    url: `${SITE_URL}/`,
    siteName: 'DienVienVN',
    locale: 'vi_VN',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: 'Chính thức ra mắt 11.11.2026. Nộp hồ sơ diễn viên ngay hôm nay.'
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
  const onPublicDomain = base === '';
  return (
    <BasePathProvider base={base}>
      <div className="dv-root">{children}</div>
      {onPublicDomain && GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="dvvn-gtag" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
        </>
      )}
    </BasePathProvider>
  );
}
