'use client';

import React, { useState, useEffect } from 'react';
import { ActMark } from '@/components/brand/act-mark';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/navigation/sidebar';
import { Topbar } from '@/components/navigation/topbar';
import { LeadDialog } from '@/components/leads/lead-dialog';
import { useCRM } from '@/lib/store/crm-context';
import { ROLE_DETAILS } from '@/lib/types/crm';
import { ImpersonationBanner } from '@/components/admin/impersonation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const { isLoading, isAuthenticated, viewAsRole, setViewAsRole } = useCRM();
  const router = useRouter();

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Loading or redirecting state
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white select-none">
        <div className="w-14 h-14 flex items-center justify-center animate-pulse mb-4">
          <ActMark className="w-12 h-12" />
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="font-bold text-base tracking-tight text-white">
            ACT ACADEMY CRM
          </h3>
          <p className="text-xs text-neutral-400">
            Đang xác thực quyền truy cập hệ thống...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {viewAsRole && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-100 border-b border-amber-300 px-4 py-2 text-xs text-amber-900">
            <span>
              Đang xem với vai trò <strong>{ROLE_DETAILS[viewAsRole].label}</strong> · chỉ xem giao diện, thao tác tạo / sửa / xoá không được lưu.
            </span>
            <button type="button" onClick={() => setViewAsRole(null)} className="font-semibold underline underline-offset-2">
              Thoát xem thử
            </button>
          </div>
        )}
        <ImpersonationBanner />
        <Topbar onOpenNewLead={() => setIsNewLeadOpen(true)} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Quick Lead Dialog */}
      <LeadDialog
        isOpen={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        leadToEdit={null}
      />
    </div>
  );
}
