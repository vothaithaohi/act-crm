'use client';

import React from 'react';
import { Search, Bell, Sparkles, UserPlus, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface TopbarProps {
  onOpenNewLead?: () => void;
}

export function Topbar({ onOpenNewLead }: TopbarProps) {
  return (
    <header className="h-16 border-b bg-card/80 backdrop-blur sticky top-0 z-20 flex items-center justify-between px-6">
      {/* Search or Page Breadcrumb */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm nhanh học viên, diễn viên, số điện thoại..."
            className="w-full bg-muted/60 hover:bg-muted text-sm rounded-lg pl-9 pr-4 py-2 border border-transparent focus:border-brand-500 focus:bg-background outline-none transition-all"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {onOpenNewLead && (
          <button
            onClick={onOpenNewLead}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Nhập Lead Mới</span>
          </button>
        )}

        <Link
          href="/talents/new"
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>+ Form Casting Mới</span>
        </Link>

        <div className="h-5 w-px bg-border mx-1" />

        {/* User / Admin Avatar & Role */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-inner">
            ACT
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold leading-tight">Admin / Casting Lead</div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Full Access</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
