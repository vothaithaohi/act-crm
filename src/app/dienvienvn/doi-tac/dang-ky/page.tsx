import type { Metadata } from 'next';
import { PartnerSignup } from '@/components/dienvienvn/partner-signup';

export const metadata: Metadata = {
  title: 'Đăng ký tài khoản đối tác — DienVienVN',
  description: 'Đạo diễn, nhà sản xuất, đối tác casting đăng ký tài khoản để đăng casting call và xem shortlist diễn viên trên DienVienVN.'
};

export default function PartnerSignupPage() {
  return <PartnerSignup />;
}
