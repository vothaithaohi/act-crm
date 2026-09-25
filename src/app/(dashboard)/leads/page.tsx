'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Kanban, 
  Table as TableIcon, 
  Plus, 
  Search, 
  Filter, 
  Sparkles, 
  Download,
  CheckCircle2,
  Clock,
  UserCheck
} from 'lucide-react';
import { useCRM } from '@/lib/store/crm-context';
import { LeadKanban } from '@/components/leads/lead-kanban';
import { LeadTable } from '@/components/leads/lead-table';
import { LeadDialog } from '@/components/leads/lead-dialog';
import { Lead } from '@/lib/types/crm';

export default function LeadsPage() {
  const { leads } = useCRM();
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchFilter, setSearchFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);

  const handleEditLead = (lead: Lead) => {
    setLeadToEdit(lead);
    setIsDialogOpen(true);
  };

  const handleCreateNew = () => {
    setLeadToEdit(null);
    setIsDialogOpen(true);
  };

  // Quick stats
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === 'new').length;
  const enrolledLeads = leads.filter(l => l.status === 'enrolled').length;
  const scheduledLeads = leads.filter(l => l.status === 'audition_scheduled' || l.status === 'audition_passed').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="w-6 h-6 text-brand-600" />
            <span>Quản trị Tuyển sinh & Bán hàng</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Quản lý phễu Lead pipeline, tiếp nhận webhook Meta Ads tự động và chuyển đổi học viên thành Talent
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Switch View Mode */}
          <div className="flex items-center bg-muted p-1 rounded-lg border">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'kanban' 
                  ? 'bg-card text-foreground shadow-xs' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Pipeline Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'table' 
                  ? 'bg-card text-foreground shadow-xs' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Bảng Dữ Liệu</span>
            </button>
          </div>

          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Lead Mới</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-card rounded-xl border shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium">Tổng Lead Tiếp Nhận</div>
            <div className="text-2xl font-bold text-foreground mt-0.5">{totalLeads}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-card rounded-xl border shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium">Lead Mới Chờ Liên Hệ</div>
            <div className="text-2xl font-bold text-blue-600 mt-0.5">{newLeads}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-card rounded-xl border shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium">Audition / Phỏng Vấn</div>
            <div className="text-2xl font-bold text-amber-600 mt-0.5">{scheduledLeads}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-card rounded-xl border shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium">Đã Nhập Học (Enrolled)</div>
            <div className="text-2xl font-bold text-rose-600 mt-0.5">{enrolledLeads}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-card rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm theo họ tên, số điện thoại, khóa học..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border bg-background focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            <span>Nguồn:</span>
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border bg-background focus:border-brand-500 outline-none cursor-pointer"
          >
            <option value="all">Tất cả nguồn ({leads.length})</option>
            <option value="meta_ads">Meta Ads (Facebook Lead Gen)</option>
            <option value="manual">Thủ công / Hotline</option>
            <option value="website_form">Form Website</option>
            <option value="referral">Giới thiệu</option>
          </select>
        </div>
      </div>

      {/* Main Content: Kanban or Table */}
      {viewMode === 'kanban' ? (
        <LeadKanban
          onEditLead={handleEditLead}
          searchFilter={searchFilter}
          sourceFilter={sourceFilter}
        />
      ) : (
        <LeadTable
          onEditLead={handleEditLead}
          searchFilter={searchFilter}
          sourceFilter={sourceFilter}
        />
      )}

      {/* Lead Create/Edit Dialog */}
      <LeadDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        leadToEdit={leadToEdit}
      />
    </div>
  );
}
