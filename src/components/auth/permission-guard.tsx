'use client';

import React from 'react';
import { 
  ShieldAlert, 
  Lock, 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  ChevronRight 
} from 'lucide-react';
import Link from 'next/link';
import { useCRM } from '@/lib/store/crm-context';
import { Permission, UserRole, ROLE_DETAILS, ROLE_PERMISSIONS } from '@/lib/types/crm';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  matchAll?: boolean; // If true, requires all permissions; default is false (requires at least one)
  customTitle?: string;
  customMessage?: string;
}

export function PermissionGuard({
  children,
  permission,
  permissions = [],
  matchAll = false,
  customTitle,
  customMessage
}: PermissionGuardProps) {
  const { currentUser, can, switchRole } = useCRM();

  // Determine required permissions list
  const requiredPerms: Permission[] = permission 
    ? [permission] 
    : permissions;

  // Check authorization
  const isAuthorized = requiredPerms.length === 0 || (
    matchAll
      ? requiredPerms.every(p => can(p))
      : requiredPerms.some(p => can(p))
  );

  if (isAuthorized) {
    return <>{children}</>;
  }

  // Find which roles have this permission to suggest to the user in demo mode
  const authorizedRoles = (['super_admin', 'sales', 'marketing', 'casting', 'developer'] as UserRole[])
    .filter(r => requiredPerms.some(p => ROLE_PERMISSIONS[r]?.includes(p)));

  const currentRoleInfo = ROLE_DETAILS[currentUser.role] || ROLE_DETAILS.super_admin;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-card border border-rose-200/60 dark:border-rose-900/40 rounded-3xl p-8 sm:p-10 shadow-xl shadow-rose-500/5 text-center space-y-6 animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Glow Icon */}
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
            <Lock className="w-10 h-10" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>403 - Quyền Truy Cập Bị Giới Hạn</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {customTitle || 'Khu Vực Yêu Cầu Phân Quyền Cao Hơn'}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            {customMessage || (
              <>
                Tài khoản của bạn hiện đang có vai trò{' '}
                <strong className="text-foreground font-semibold">{currentRoleInfo.label}</strong>{' '}
                ({currentUser.department || 'Bộ phận nội bộ'}), không có quyền thực hiện thao tác hoặc truy cập vào trang này.
              </>
            )}
          </p>
        </div>

        {/* Required Permissions Badges */}
        <div className="p-3 bg-muted/60 border rounded-xl text-left text-xs space-y-1.5 max-w-md mx-auto">
          <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider block">
            Quyền Hạn Yêu Cầu Cần Có:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {requiredPerms.map(p => (
              <span 
                key={p} 
                className="px-2.5 py-1 bg-background border border-border/80 rounded-md font-mono text-[11px] text-brand-600 font-semibold shadow-xs"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Interactive Role Switcher for Testing / Stakeholders */}
        {authorizedRoles.length > 0 && (
          <div className="pt-2 border-t border-border/60 text-left space-y-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
              Kiểm thử với vai trò được cấp phép:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {authorizedRoles.map(r => {
                const rInfo = ROLE_DETAILS[r];
                return (
                  <button
                    key={r}
                    onClick={() => switchRole(r)}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-background hover:bg-muted/80 text-left transition-all hover:scale-[1.01] active:scale-[0.99] group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-semibold text-foreground group-hover:text-brand-600 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Chuyển sang {rInfo.label.split(' ')[0]}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                        {rInfo.desc}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background hover:bg-foreground/90 rounded-xl text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về Trang Tổng Quan (Dashboard)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
