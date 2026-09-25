'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCRM } from '@/lib/store/crm-context';
import { TalentDetailView } from '@/components/talents/talent-detail-view';
import { Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TalentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getTalentById, isLoading } = useCRM();

  const talentId = params?.id as string;
  const talent = getTalentById(talentId);

  if (isLoading) {
    return (
      <div className="p-16 text-center text-xs text-muted-foreground">
        Đang tải dữ liệu hồ sơ diễn viên...
      </div>
    );
  }

  if (!talent) {
    return (
      <div className="p-16 bg-card rounded-2xl border text-center space-y-4 max-w-md mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-base">Không tìm thấy hồ sơ diễn viên</h3>
        <p className="text-xs text-muted-foreground">
          Hồ sơ này không tồn tại hoặc đã bị xóa khỏi hệ thống.
        </p>
        <Link
          href="/talents"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white rounded-lg text-xs font-semibold hover:bg-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về Danh Sách Diễn Viên</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-2">
      <TalentDetailView talent={talent} />
    </div>
  );
}
