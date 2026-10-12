'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/navigation/sidebar';
import { Topbar } from '@/components/navigation/topbar';
import { LeadDialog } from '@/components/leads/lead-dialog';
import { useCRM } from '@/lib/store/crm-context';
import { Clapperboard } from 'lucide-react';

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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white select-none">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-rose-500 flex items-center justify-center text-white shadow-xl shadow-brand-500/30 animate-pulse mb-4">
          <Clapperboard className="w-7 h-7" />
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="font-bold text-base tracking-tight text-white">
            ACT ACADEMY CRM
          </h3>
          <p className="text-xs text-slate-400">
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
