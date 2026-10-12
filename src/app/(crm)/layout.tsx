import { CRMProvider } from '@/lib/store/crm-context';

export default function CRMRootLayout({ children }: { children: React.ReactNode }) {
  return <CRMProvider>{children}</CRMProvider>;
}
