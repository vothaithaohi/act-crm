import type { Metadata } from 'next';
import { CrewAccount } from '@/components/dienvienvn/crew-apply';

export const metadata: Metadata = { title: 'Tài khoản ekip — DienVienVN', robots: { index: false, follow: false } };

export default function CrewAccountPage() {
  return <CrewAccount />;
}
