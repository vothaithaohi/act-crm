'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Users, 
  Sparkles, 
  Film, 
  UserCheck, 
  Clock, 
  ArrowUpRight, 
  ArrowRight, 
  CheckCircle2, 
  TrendingUp, 
  Share2, 
  Database, 
  FileSpreadsheet,
  Facebook,
  Award
} from 'lucide-react';
import { useCRM } from '@/lib/store/crm-context';
import { formatPhoneNumber, formatDate } from '@/lib/utils';
import { TalentCard } from '@/components/talents/talent-card';

export default function DashboardOverviewPage() {
  const { leads, talents } = useCRM();

  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === 'new').length;
  const enrolledLeads = leads.filter(l => l.status === 'enrolled').length;
  const passedAudition = leads.filter(l => l.status === 'audition_passed').length;
  const metaLeads = leads.filter(l => l.source === 'meta_ads').length;

  const conversionRate = totalLeads > 0 ? ((enrolledLeads / totalLeads) * 100).toFixed(1) : '0';

  const recentLeads = leads.slice(0, 6);
  const featuredTalents = talents.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950 text-white p-8 md:p-10 shadow-xl border border-white/10">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-rose-300 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>ACT Academy Growth & Talent Casting System</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Mini CRM & Bộ Lọc Tuyển Vai Diễn Viên
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Hệ thống quản lý chu trình tuyển sinh từ Meta Ads và kho hồ sơ casting diễn viên chuyên sâu. Đã nhập sẵn <span className="text-white font-bold">{leads.length} học viên</span> từ dữ liệu thực tế ACT Academy.
          </p>

          <div className="flex flex-wrap gap-3 pt-3">
            <Link
              href="/leads"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-lg shadow-brand-500/30 transition-all hover:scale-[1.02]"
            >
              <Users className="w-4 h-4" />
              <span>Pipeline Tuyển Sinh</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/talents"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-bold border border-white/15 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Casting Matching Engine</span>
            </Link>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-card rounded-2xl border shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Học Viên / Lead</span>
            <Users className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-3xl font-extrabold text-foreground">{totalLeads}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Nạp từ file Excel gốc ACT</span>
          </div>
        </div>

        <div className="p-5 bg-card rounded-2xl border shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Đã Nhập Học</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">{enrolledLeads}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tỷ lệ chuyển đổi: {conversionRate}%</span>
          </div>
        </div>

        <div className="p-5 bg-card rounded-2xl border shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Meta Ads Leads</span>
            <Facebook className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-blue-600">{metaLeads}</div>
          <div className="text-[11px] text-muted-foreground">
            Sẵn sàng nhận qua Webhook
          </div>
        </div>

        <div className="p-5 bg-card rounded-2xl border shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Talent Pool</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-amber-600">{talents.length}</div>
          <div className="text-[11px] text-muted-foreground">
            Hồ sơ diễn viên sẵn sàng tuyển vai
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Leads & Featured Talents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Recent Leads */}
        <div className="bg-card rounded-2xl border p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-500" />
                <span>Học Viên Tiềm Năng Mới Nhất</span>
              </h3>
              <p className="text-xs text-muted-foreground">Danh sách lead tiếp nhận từ tuyển sinh</p>
            </div>
            <Link
              href="/leads"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-foreground text-sm">{lead.full_name}</div>
                  <div className="text-muted-foreground">
                    {formatPhoneNumber(lead.phone)} • <span className="text-foreground font-medium">{lead.course_interest || 'Chưa chọn'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                    lead.status === 'enrolled' 
                      ? 'bg-rose-100 text-rose-700' 
                      : lead.status === 'new'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {lead.status === 'enrolled' ? 'Đã nhập học' : lead.status === 'new' ? 'Mới' : lead.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Featured Talents for Casting */}
        <div className="bg-card rounded-2xl border p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Talent Pool Diễn Viên Nổi Bật</span>
              </h3>
              <p className="text-xs text-muted-foreground">Diễn viên có hồ sơ comp-card đầy đủ</p>
            </div>
            <Link
              href="/talents"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>Bộ lọc tuyển vai</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {featuredTalents.map((t) => (
              <Link
                key={t.id}
                href={`/talents/${t.id}`}
                className="group rounded-xl border overflow-hidden bg-muted/40 hover:border-brand-500/50 transition-all"
              >
                <div className="aspect-[3/4] relative bg-muted">
                  <img
                    src={t.headshot_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'}
                    alt={t.full_name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 text-white">
                    <div className="font-bold text-xs line-clamp-1">{t.full_name}</div>
                    <div className="text-[10px] text-white/80">{t.height_cm} cm • {t.weight_kg} kg</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="p-3 bg-muted/50 rounded-xl border border-border/60 text-xs flex items-center justify-between">
            <span className="text-muted-foreground">Muốn tìm kiếm theo nhân trắc học, cảnh hôn, võ thuật?</span>
            <Link href="/talents" className="font-semibold text-brand-600 hover:underline">
              Mở Bộ Lọc →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
