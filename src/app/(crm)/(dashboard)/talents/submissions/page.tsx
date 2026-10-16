'use client';

import React from 'react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { SubmissionsReview } from '@/components/talents/submissions-review';

export default function TalentSubmissionsPage() {
  return (
    <PermissionGuard
      permission="talents:read"
      customTitle="Hồ Sơ Nộp Từ DienVienVN"
      customMessage="Bạn không có quyền xem hồ sơ diễn viên tự nộp từ dienvienvn.com."
    >
      <SubmissionsReview />
    </PermissionGuard>
  );
}
