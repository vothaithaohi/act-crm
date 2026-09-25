'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  UserPlus, 
  ShieldCheck, 
  ChevronDown, 
  Check, 
  LogOut,
  User,
  Shield
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCRM } from '@/lib/store/crm-context';
import { UserRole, ROLE_DETAILS } from '@/lib/types/crm';

interface TopbarProps {
  onOpenNewLead?: () => void;
}

export function Topbar({ onOpenNewLead }: TopbarProps) {
  const { currentUser, switchRole, can, logout } = useCRM();
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
  const activeRole = currentUser?.role || 'super_admin';
  const activeRoleInfo = ROLE_DETAILS[activeRole] || ROLE_DETAILS.super_admin;

  const handleLogout = () => {
    setIsRoleDropdownOpen(false);
    logout();
    router.push('/login');
  };

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

        {/* User Profile & Role Switcher Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl border border-border/80 bg-background hover:bg-muted/60 transition-all cursor-pointer"
            title="Tài khoản & Phân quyền"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-inner">
              {currentUser?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold leading-tight flex items-center gap-1.5">
                <span>{currentUser?.full_name || 'Khách truy cập'}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${activeRoleInfo.badge}`}>
                  {activeRoleInfo.label.split(' ')[0]}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span>{currentUser?.department || 'Ban Quản Trị'}</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
          </button>

          {/* User Menu Dropdown */}
          {isRoleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-popover border border-border rounded-xl shadow-xl py-2 z-50 animate-in fade-in-0 zoom-in-95">
              {/* Profile Card Header */}
              <div className="px-3.5 py-3 border-b border-border/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                    Tài Khoản Đăng Nhập
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${activeRoleInfo.badge}`}>
                    {activeRoleInfo.label}
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground truncate">
                  {currentUser?.full_name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate font-mono">
                  {currentUser?.email}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Phòng ban: <span className="font-medium text-foreground">{currentUser?.department || 'ACT Academy'}</span>
                </p>
              </div>

              {/* Admin Links */}
              {can('users:manage') && (
                <div className="px-2 pt-1.5 pb-1">
                  <Link 
                    href="/admin/users" 
                    onClick={() => setIsRoleDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg font-medium transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                    <span>Quản trị tài khoản & Phân quyền</span>
                  </Link>
                </div>
              )}

              {/* Logout Button */}
              <div className="px-2 pt-1 pb-1 border-t border-border/60">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng Xuất Khỏi Hệ Thống</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
