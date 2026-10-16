import type { Metadata } from 'next';
import { CRMProvider } from '@/lib/store/crm-context';

// Logo ACT nền đen chỉ cho CRM; DienVienVN có icon riêng (src/app/dienvienvn/icon.svg)
export const metadata: Metadata = {
  icons: {
    icon: [
      { url: '/act-icon.svg', type: 'image/svg+xml' },
      { url: '/act-favicon.ico', sizes: 'any' }
    ],
    apple: '/act-apple-icon.png'
  }
};

export default function CRMRootLayout({ children }: { children: React.ReactNode }) {
  return <CRMProvider>{children}</CRMProvider>;
}
