'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { GuestDetail } from '@/components/guests/guest-detail';

export default function NewGuestPage() {
  return (
    <PermissionGuard permission="talents:write" customTitle="Khách mời showcase" customMessage="Danh sách khách mời chỉ dành cho Ban Giám Đốc và bộ phận Casting.">
      <GuestDetail guestId={null} />
    </PermissionGuard>
  );
}
