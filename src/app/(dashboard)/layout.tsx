'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/navigation/sidebar';
import { Topbar } from '@/components/navigation/topbar';
import { LeadDialog } from '@/components/leads/lead-dialog';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);

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
