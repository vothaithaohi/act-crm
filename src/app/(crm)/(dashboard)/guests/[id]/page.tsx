'use client';

import { use } from 'react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { GuestDetail } from '@/components/guests/guest-detail';

export default function GuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <PermissionGuard permission="talents:write" customTitle="Khách mời showcase" customMessage="Danh sách khách mời chỉ dành cho Ban Giám Đốc và bộ phận Casting.">
      <GuestDetail guestId={id} />
    </PermissionGuard>
  );
}
