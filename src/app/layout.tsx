import type { Metadata } from 'next';
import './globals.css';
import { CRMProvider } from '@/lib/store/crm-context';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'ACT Academy - Mini CRM & Talent Casting',
  description: 'Hệ thống Quản trị Tuyển sinh (Academy Growth) & Tuyển vai Diễn viên (Talent Casting Matching) cho ACT Academy',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased selection:bg-brand-500 selection:text-white">
        <CRMProvider>
          {children}
          <Toaster position="top-right" richColors />
        </CRMProvider>
      </body>
    </html>
  );
}
