'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { ReferralAdmin } from '@/components/admin/referral-admin';

/** Giới thiệu (Referral): link ?ref= cho từng người giới thiệu + số hồ sơ diễn viên mỗi người mang về. */
export default function ReferralsPage() {
  return (
    <PermissionGuard permissions={['talents:export']} customTitle="Giới thiệu (Referral)" customMessage="Chỉ Admin / Casting xem mục này.">
      <ReferralAdmin />
    </PermissionGuard>
  );
}
