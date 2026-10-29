'use client';

import React from 'react';
import { TalentMultiStepForm } from '@/components/talents/talent-multi-step-form';
import { PermissionGuard } from '@/components/auth/permission-guard';

export default function NewTalentPage() {
  return (
    <PermissionGuard
      permission="talents:write"
      customTitle="Tạo Mới Hồ Sơ Diễn Viên Casting"
      customMessage="Quyền tạo mới và nhập form tuyển sinh diễn viên 6 bước chỉ dành cho Casting Director và Ban Giám Đốc."
    >
      <div className="py-2">
        <TalentMultiStepForm isEdit={false} />
      </div>
    </PermissionGuard>
  );
}
