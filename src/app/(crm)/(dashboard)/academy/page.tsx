'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { AcademyAdmin } from '@/components/academy/academy-admin';
import { useCRM } from '@/lib/store/crm-context';

/** Academy · Blog: Admin viết bài kiến thức cho dienvienvn.com/academy. */
export default function AcademyPage() {
  const { currentUser } = useCRM();
  return (
    <PermissionGuard permissions={['users:manage']} customTitle="Academy · Blog" customMessage="Chỉ Admin viết và đăng bài Academy.">
      <AcademyAdmin authorName={currentUser?.full_name || 'ACT Academy'} />
    </PermissionGuard>
  );
}
