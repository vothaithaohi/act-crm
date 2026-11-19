import type { Metadata } from 'next';
import { PartnerSignup } from '@/components/dienvienvn/partner-signup';
import { localizeMetadata } from '@/lib/dienvienvn/i18n/server';

const META: Metadata = {
  title: 'Đăng ký tài khoản đối tác — DienVienVN',
  description: 'Đạo diễn, nhà sản xuất, đối tác casting đăng ký tài khoản để đăng casting call và xem shortlist diễn viên trên DienVienVN.'
};

export default function PartnerSignupPage() {
  return <PartnerSignup />;
}

/** Tiêu đề / mô tả theo ngôn ngữ trang (bản /en dịch sang tiếng Anh). */
export const generateMetadata = () => localizeMetadata(META);
