'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  Sparkles, 
  LayoutDashboard, 
  UserPlus, 
  Clapperboard, 
  GraduationCap, 
  RotateCcw,
  ShieldCheck,
  Terminal,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCRM } from '@/lib/store/crm-context';

export function Sidebar() {
  const pathname = usePathname();
  const { leads, talents, resetAllData, can, webhookLogs } = useCRM();

  const mainNavItems = [
    {
      title: 'Tổng quan',
      href: '/',
      icon: LayoutDashboard,
      badge: null,
      visible: true
    },
    {
      title: 'Quản trị Tuyển sinh',
      href: '/leads',
      icon: Users,
      badge: leads.length,
      visible: can('leads:read')
    },
    {
      title: 'Casting Matching',
      href: '/talents',
      icon: Sparkles,
      badge: talents.length,
      visible: can('talents:read')
    },
    {
      title: 'Thêm Hồ Sơ Casting',
      href: '/talents/new',
      icon: UserPlus,
      badge: null,
      visible: can('talents:write')
    }
  ];

  const adminNavItems = [
    {
      title: 'Nhân Sự & Phân Quyền',
      href: '/admin/users',
      icon: ShieldCheck,
      badge: 'RBAC',
      visible: can('users:manage')
    },
    {
      title: 'Meta Webhook & API',
      href: '/admin/webhooks',
      icon: Terminal,
      badge: webhookLogs.length > 0 ? `${webhookLogs.length} logs` : null,
      visible: can('webhooks:manage')
    }
  ];

  const showAdminSection = adminNavItems.some(i => i.visible);

  return (
    <aside className="w-64 border-r bg-card flex flex-col justify-between h-screen sticky top-0 shrink-0 z-30 select-none overflow-y-auto">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-base tracking-tight flex items-center gap-1.5">
                <span>ACT ACADEMY</span>
                <span className="text-[10px] bg-brand-100 text-brand-700 font-semibold px-1.5 py-0.5 rounded uppercase">CRM</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">Growth & Talent Casting</p>
            </div>
          </Link>
        </div>

        {/* Operational Navigation Menu */}
        <div className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Nghiệp vụ cốt lõi
          </div>
          {mainNavItems.filter(item => item.visible).map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn('w-4 h-4 transition-transform group-hover:scale-110', isActive ? 'text-white' : 'text-muted-foreground')} />
                  <span>{item.title}</span>
                </div>
                {item.badge !== null && (
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-semibold',
                    isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                  )}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Administration Section */}
        {showAdminSection && (
          <div className="p-3 pt-1 space-y-1">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Hệ Thống & Quản Trị</span>
              <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-mono font-bold">ADMIN</span>
            </div>
            {adminNavItems.filter(item => item.visible).map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group',
                    isActive
                      ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn('w-4 h-4 transition-transform group-hover:scale-110', isActive ? 'text-white' : 'text-muted-foreground')} />
                    <span>{item.title}</span>
                  </div>
                  {item.badge !== null && (
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-md font-semibold font-mono',
                      isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                    )}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Quick Highlights */}
        <div className="px-4 py-3 mx-3 mt-2 rounded-xl bg-muted/50 border border-border/60 text-xs space-y-2">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-brand-600" />
            <span>Dữ liệu ACT Academy</span>
          </div>
          <p className="text-muted-foreground leading-relaxed text-[11px]">
            Hệ thống đã nạp <span className="font-bold text-foreground">{leads.length}</span> học viên thực tế từ Excel và <span className="font-bold text-foreground">{talents.length}</span> hồ sơ diễn viên.
          </p>
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-4 border-t space-y-3">
        <button
          onClick={resetAllData}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-brand-600 bg-muted/60 hover:bg-brand-50 rounded-lg transition-colors border"
          title="Khôi phục lại toàn bộ dữ liệu ban đầu từ file Excel"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Dữ liệu Excel</span>
        </button>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>ACT CRM v2.0</span>
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Trực tuyến
          </span>
        </div>
      </div>
    </aside>
  );
}
