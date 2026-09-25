'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useCRM } from '@/lib/store/crm-context';
import { TalentMultiStepForm } from '@/components/talents/talent-multi-step-form';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function EditTalentPage() {
  const params = useParams();
  const { getTalentById, isLoading } = useCRM();

  const talentId = params?.id as string;
  const talent = getTalentById(talentId);

  if (isLoading) {
    return (
      <div className="p-16 text-center text-xs text-muted-foreground">
        Đang tải dữ liệu...
      </div>
    );
  }

  if (!talent) {
    return (
      <div className="p-16 bg-card rounded-2xl border text-center space-y-4 max-w-md mx-auto my-12">
        <h3 className="font-bold text-base">Không tìm thấy hồ sơ diễn viên</h3>
        <Link
          href="/talents"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về Danh Sách Diễn Viên</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-2">
      <TalentMultiStepForm initialData={talent} isEdit={true} />
    </div>
  );
}
