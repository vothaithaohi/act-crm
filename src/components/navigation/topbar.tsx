'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  UserPlus, 
  ShieldCheck, 
  ChevronDown, 
  Check, 
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { useCRM } from '@/lib/store/crm-context';
import { UserRole, ROLE_DETAILS } from '@/lib/types/crm';

interface TopbarProps {
  onOpenNewLead?: () => void;
}

export function Topbar({ onOpenNewLead }: TopbarProps) {
  const { currentUser, switchRole, can } = useCRM();
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const rolesList: UserRole[] = ['super_admin', 'sales', 'marketing', 'casting', 'developer'];
  const activeRoleInfo = ROLE_DETAILS[currentUser.role] || ROLE_DETAILS.super_admin;

  return (
    <header className="h-16 border-b bg-card/80 backdrop-blur sticky top-0 z-20 flex items-center justify-between px-6">
      {/* Search Bar */}
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
        {/* Quick action: New Lead (Sales, Super Admin, Marketing) */}
        {onOpenNewLead && can('leads:write') && (
          <button
            onClick={onOpenNewLead}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Nhập Lead Mới</span>
          </button>
        )}

        {/* Quick action: New Casting Form (Casting, Super Admin) */}
        {can('talents:write') && (
          <Link
            href="/talents/new"
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ Form Casting Mới</span>
          </Link>
        )}

        <div className="h-5 w-px bg-border mx-1" />

        {/* Live RBAC Role Switcher Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl border border-border/80 bg-background hover:bg-muted/60 transition-all cursor-pointer"
            title="Nhấp để chuyển đổi vai trò (RBAC Simulator)"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-inner">
              {currentUser.full_name?.charAt(0) || 'A'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold leading-tight flex items-center gap-1.5">
                <span>{currentUser.full_name}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${activeRoleInfo.badge}`}>
                  {activeRoleInfo.label.split(' ')[0]}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span>{currentUser.department || 'Ban Quản Trị'}</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
          </button>

          {/* Role Dropdown Menu */}
          {isRoleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-popover border border-border rounded-xl shadow-xl py-2 z-50 animate-in fade-in-0 zoom-in-95">
              <div className="px-3 py-2 border-b border-border/60">
                <p className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                  <span>Mô phỏng Phân Quyền (RBAC)</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Chọn vai trò để kiểm thử quyền hạn hệ thống theo thời gian thực
                </p>
              </div>

              <div className="py-1">
                {rolesList.map((r) => {
                  const roleMeta = ROLE_DETAILS[r];
                  const isCurrent = currentUser.role === r;

                  return (
                    <button
                      key={r}
                      onClick={() => {
                        switchRole(r);
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-start gap-2.5 transition-colors ${
                        isCurrent ? 'bg-brand-50/70 dark:bg-brand-950/40 font-medium' : 'hover:bg-muted'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isCurrent ? (
                          <Check className="w-4 h-4 text-brand-600" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-border" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground text-xs">{roleMeta.label}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {roleMeta.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="px-3 pt-2 pb-1 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between">
                <span>Quản trị tài khoản:</span>
                <Link 
                  href="/admin/users" 
                  onClick={() => setIsRoleDropdownOpen(false)}
                  className="text-brand-600 hover:underline font-semibold"
                >
                  Xem phân quyền →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
