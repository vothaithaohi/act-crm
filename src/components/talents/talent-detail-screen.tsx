'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowLeft } from 'lucide-react';
import type { TalentProfile } from '@/lib/types/crm';
import { TalentDetailView } from '@/components/talents/talent-detail-view';
import { PermissionGuard } from '@/components/auth/permission-guard';

/** Màn hình chi tiết hồ sơ diễn viên trong CRM (dùng cho /<username> và /talents/<id>). */
export function TalentDetailScreen({ talent, isLoading }: { talent: TalentProfile | undefined; isLoading: boolean }) {

  return (
    <PermissionGuard
      permission="talents:read"
      customTitle="Chi Tiết Hồ Sơ Diễn Viên"
      customMessage="Bạn không có quyền truy cập vào thông tin hồ sơ diễn viên của ACT Academy."
    >
      {isLoading ? (
        <div className="p-16 text-center text-xs text-muted-foreground">
          Đang tải dữ liệu hồ sơ diễn viên...
        </div>
      ) : !talent ? (
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
      ) : (
        <div className="py-2">
          <TalentDetailView talent={talent} />
        </div>
      )}
    </PermissionGuard>
  );
}
