'use client';

import React, { useState } from 'react';
import { 
  Phone, 
  Sparkles, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight, 
  Facebook, 
  Globe, 
  Share2, 
  Headphones 
} from 'lucide-react';
import { Lead, LeadStatus, LeadSource } from '@/lib/types/crm';
import { useCRM } from '@/lib/store/crm-context';
import { formatDate, formatPhoneNumber } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { useRouter } from 'next/navigation';

interface LeadTableProps {
  onEditLead: (lead: Lead) => void;
  searchFilter: string;
  sourceFilter: string;
}

const STATUS_LABELS: Record<LeadStatus, { label: string; badge: string }> = {
  new: { label: '1. Mới tiếp nhận', badge: 'bg-blue-100 text-blue-700' },
  contacted: { label: '2. Đã liên hệ', badge: 'bg-indigo-100 text-indigo-700' },
  audition_scheduled: { label: '3. Hẹn Audition', badge: 'bg-amber-100 text-amber-700' },
  audition_passed: { label: '4. Đạt Audition', badge: 'bg-emerald-100 text-emerald-700' },
  enrolled: { label: '5. Đã nhập học', badge: 'bg-rose-100 text-rose-700' },
  lost: { label: '6. Không phù hợp', badge: 'bg-slate-100 text-slate-700' },
};

export function LeadTable({ onEditLead, searchFilter, sourceFilter }: LeadTableProps) {
  const { leads, updateLeadStatus, deleteLead, convertToTalent, can } = useCRM();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filter
  const filteredLeads = leads.filter(l => {
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const matchName = l.full_name.toLowerCase().includes(q);
      const matchPhone = l.phone.toLowerCase().includes(q);
      const matchCourse = (l.course_interest || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchCourse) return false;
    }
    if (sourceFilter !== 'all') {
      if (l.source !== sourceFilter) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleConvert = (leadId: string) => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      const talentId = convertToTalent(leadId);
      setTimeout(() => {
        router.push(`/talents/${talentId}`);
      }, 500);
    } catch (err: any) {
      alert(err.message || 'Lỗi chuyển đổi lead');
    }
  };

  const renderSourceBadge = (source: LeadSource) => {
    switch (source) {
      case 'meta_ads':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200/50">
            <Facebook className="w-2.5 h-2.5" /> Meta Ads
          </span>
        );
      case 'website_form':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200/50">
            <Globe className="w-2.5 h-2.5" /> Website
          </span>
        );
      case 'referral':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200/50">
            <Share2 className="w-2.5 h-2.5" /> Giới thiệu
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-50 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200/50">
            <Headphones className="w-2.5 h-2.5" /> Hotline
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Table Container */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Số điện thoại</th>
                <th className="py-3 px-4">Khóa học / Ghi chú</th>
                <th className="py-3 px-4">Nguồn</th>
                <th className="py-3 px-4">Trạng thái Pipeline</th>
                <th className="py-3 px-4">Ngày tạo</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                    Không tìm thấy học viên nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground group-hover:text-brand-600 transition-colors">
                        {lead.full_name}
                      </div>
                      <div className="text-xs text-muted-foreground">{lead.email || '—'}</div>
                    </td>

                    <td className="py-3 px-4 font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-brand-500" />
                        <span>{formatPhoneNumber(lead.phone)}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-xs font-medium text-foreground line-clamp-1">
                        {lead.course_interest || 'Chưa chọn'}
                      </div>
                      {lead.notes && (
                        <div className="text-[11px] text-muted-foreground line-clamp-1 italic">
                          {lead.notes}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {renderSourceBadge(lead.source)}
                    </td>

                    <td className="py-3 px-4">
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border outline-none cursor-pointer transition-colors ${STATUS_LABELS[lead.status].badge}`}
                      >
                        <option value="new">1. Mới tiếp nhận</option>
                        <option value="contacted">2. Đã liên hệ</option>
                        <option value="audition_scheduled">3. Hẹn Audition</option>
                        <option value="audition_passed">4. Đạt Audition</option>
                        <option value="enrolled">5. Đã nhập học</option>
                        <option value="lost">6. Không phù hợp</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {formatDate(lead.created_at)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {can('leads:convert') && (
                          lead.status !== 'enrolled' ? (
                            <button
                              onClick={() => handleConvert(lead.id)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60 rounded-md text-xs font-semibold transition-colors"
                              title="Chuyển thành Diễn viên / Học viên"
                            >
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span>Convert</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-rose-600 font-semibold px-2 py-0.5 bg-rose-50 rounded">
                              Diễn viên
                            </span>
                          )
                        )}

                        {can('leads:write') && (
                          <button
                            onClick={() => onEditLead(lead)}
                            className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors"
                            title="Sửa thông tin"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}

                        {can('leads:delete') && (
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xóa lead ${lead.full_name}?`)) {
                                deleteLead(lead.id);
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 text-muted-foreground hover:text-rose-600 rounded-md transition-colors"
                            title="Xóa lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Hiển thị <span className="font-semibold text-foreground">{paginatedLeads.length}</span> / <span className="font-semibold text-foreground">{filteredLeads.length}</span> học viên
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-1.5 rounded border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-foreground">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-1.5 rounded border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
