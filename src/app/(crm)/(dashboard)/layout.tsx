'use client';

import React, { useState, useEffect } from 'react';
import { ActMark } from '@/components/brand/act-mark';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/navigation/sidebar';
import { Topbar } from '@/components/navigation/topbar';
import { LeadDialog } from '@/components/leads/lead-dialog';
import { useCRM } from '@/lib/store/crm-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const { currentUser, isLoading, isAuthenticated } = useCRM();
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
