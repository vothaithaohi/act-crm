import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { headers } from 'next/headers';
import { LANG_HEADER } from '@/lib/dienvienvn/i18n/core';

export const metadata: Metadata = {
  title: 'ACT Academy - Mini CRM & Talent Casting',
  description: 'Hệ thống Quản trị Tuyển sinh (Academy Growth) & Tuyển vai Diễn viên (Talent Casting Matching) cho ACT Academy',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={(await headers()).get(LANG_HEADER) === 'en' ? 'en' : 'vi'} suppressHydrationWarning>
      <body className="antialiased selection:bg-brand-gold/40 selection:text-black">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
