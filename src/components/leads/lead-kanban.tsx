'use client';

import React, { useState } from 'react';
import { 
  Phone, 
  Sparkles, 
  MoreHorizontal, 
  Trash2, 
  Edit3, 
  Calendar, 
  BookOpen, 
  Share2, 
  Compass, 
  Layers,
  Facebook,
  Globe,
  Headphones,
  UserCheck,
  DollarSign
} from 'lucide-react';
import { Lead, LeadStatus, LeadSource } from '@/lib/types/crm';
import { useCRM } from '@/lib/store/crm-context';
import { formatDate, formatPhoneNumber } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { useRouter } from 'next/navigation';
import { LEAD_STATUS_DETAILS, ACT_LEVEL_DETAILS } from '@/lib/types/crm';
import { GraduationCap, Eye } from 'lucide-react';

interface LeadKanbanProps {
  onEditLead: (lead: Lead) => void;
  onSelectLead?: (lead: Lead) => void;
  searchFilter: string;
  sourceFilter: string;
}

const COLUMNS: { id: LeadStatus; label: string; shortLabel: string; color: string; badgeColor: string; desc: string }[] = [
  { 
    id: 'intake', 
    label: '1. Tiếp nhận ban đầu (Intake)',
    shortLabel: 'Tiếp nhận',
    color: 'border-t-blue-500 bg-blue-50/20 dark:bg-blue-950/10',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    desc: 'Lead mới từ Ads/form chưa xử lý'
  },
  { 
    id: 'qualified', 
    label: '2. Đạt tiêu chuẩn (Qualified)',
    shortLabel: 'Tiềm năng',
    color: 'border-t-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    desc: 'Đúng độ tuổi, khu vực & nhu cầu học'
  },
  { 
    id: 'contacted', 
    label: '3. Đã liên hệ (Contacted)',
    shortLabel: 'Đã liên hệ',
    color: 'border-t-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10',
    badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    desc: 'Đã gọi điện, gửi tin nhắn tư vấn'
  },
  { 
    id: 'considering', 
    label: '4. Đang cân nhắc (Considering)',
    shortLabel: 'Đang cân nhắc',
    color: 'border-t-amber-500 bg-amber-50/20 dark:bg-amber-950/10',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    desc: 'Cần sắp xếp lịch trình hoặc tài chính'
  },
  { 
    id: 'trial_in_person', 
    label: '5. Học thử / Audition (Trial)',
    shortLabel: 'Học thử / Test',
    color: 'border-t-purple-500 bg-purple-50/20 dark:bg-purple-950/10',
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    desc: 'Đã hẹn/tham gia học thử hoặc casting'
  },
  { 
    id: 'follow_up_later', 
    label: '6. Chăm sóc lại sau (Follow up)',
    shortLabel: 'Chăm sóc sau',
    color: 'border-t-slate-400 bg-slate-50/30 dark:bg-slate-900/10',
    badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    desc: 'Hẹn lại thời điểm phù hợp hơn'
  },
  { 
    id: 'converted', 
    label: '7. Đã nhập học (Converted)',
    shortLabel: 'Đã nhập học',
    color: 'border-t-rose-500 bg-rose-50/20 dark:bg-rose-950/10',
    badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    desc: 'Đã đóng học phí thành công'
  }
];

export function LeadKanban({ onEditLead, onSelectLead, searchFilter, sourceFilter }: LeadKanbanProps) {
  const { leads, updateLeadStatus, deleteLead, convertToTalent, can, teamMembers } = useCRM();
  const router = useRouter();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  // Filter leads
  const filteredLeads = leads.filter(l => {
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const matchName = l.full_name.toLowerCase().includes(q);
      const matchPhone = (l.phone || '').toLowerCase().includes(q);
      const matchCourse = (l.course_interest || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchCourse) return false;
    }
    if (sourceFilter !== 'all') {
      if (l.source !== sourceFilter) return false;
    }
    return true;
  });

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      updateLeadStatus(leadId, targetStatus);
    }
    setDraggedLeadId(null);
  };

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
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            <Facebook className="w-2.5 h-2.5" /> Meta Ads
          </span>
        );
      case 'website_form':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
            <Globe className="w-2.5 h-2.5" /> Website
          </span>
        );
      case 'referral':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
            <Share2 className="w-2.5 h-2.5" /> Giới thiệu
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
            <Headphones className="w-2.5 h-2.5" /> Trực tiếp / Hotline
          </span>
        );
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-2 select-none min-h-[calc(100vh-230px)]">
      {COLUMNS.map((col) => {
        const columnLeads = filteredLeads.filter(l => l.status === col.id);

        return (
          <div
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`w-80 shrink-0 flex flex-col rounded-xl border border-t-4 bg-card/60 backdrop-blur-sm ${col.color} transition-all`}
          >
            {/* Column Header */}
            <div className="p-3.5 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wide">
                  {col.label}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${col.badgeColor}`}>
                  {columnLeads.length}
                </span>
              </div>
            </div>

            {/* Column Cards List */}
            <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-290px)]">
              {columnLeads.length === 0 ? (
                <div className="h-28 rounded-lg border border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-xs text-muted-foreground">
                  <span>Kéo thả thẻ lead vào đây</span>
                </div>
              ) : (
                columnLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onClick={() => onSelectLead?.(lead)}
                    className="p-3.5 bg-card hover:bg-card/90 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer group relative space-y-2.5 hover:border-brand-500/40"
                  >
                    {/* Top Row: Name & Source */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-brand-600 transition-colors">
                        {lead.full_name}
                      </div>
                      {renderSourceBadge(lead.source)}
                    </div>

                    {/* Highest ACT Level Badge */}
                    {lead.academic_profile?.highest_act_level && (
                      <div className="flex items-center gap-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${ACT_LEVEL_DETAILS[lead.academic_profile.highest_act_level]?.badgeClass || 'bg-amber-100 text-amber-800'}`}>
                          <GraduationCap className="w-3 h-3" />
                          <span>Lớp {lead.academic_profile.highest_act_level}</span>
                          {lead.academic_profile.highest_class_code && (
                            <span className="opacity-80">({lead.academic_profile.highest_class_code})</span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Phone & Course */}
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 text-foreground font-medium">
                        <Phone className="w-3.5 h-3.5 text-brand-500" />
                        <span>{lead.phone ? formatPhoneNumber(lead.phone) : <span className="text-muted-foreground/60 italic font-normal text-[11px]">Chưa cập nhật SĐT</span>}</span>
                      </div>

                      {lead.course_interest && (
                        <div className="flex items-start gap-1.5 line-clamp-2">
                          <BookOpen className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span className="text-[11px] text-muted-foreground">{lead.course_interest}</span>
                        </div>
                      )}

                      {lead.notes && (
                        <div className="p-2 bg-muted/50 rounded-lg text-[11px] text-muted-foreground line-clamp-2 italic border border-border/40">
                          {lead.notes}
                        </div>
                      )}

                      {/* Assigned Staff & Tuition Fee Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {lead.assigned_to && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border">
                            <UserCheck className="w-3 h-3 text-brand-600" />
                            <span>
                              {teamMembers.find(m => m.id === lead.assigned_to)?.full_name || 'Phụ trách'}
                            </span>
                          </div>
                        )}

                        {lead.tuition_fee && Number(lead.tuition_fee) > 0 && (
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200/50">
                            <DollarSign className="w-3 h-3 text-emerald-600" />
                            <span>{new Intl.NumberFormat('vi-VN').format(Number(lead.tuition_fee))} ₫</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="pt-2 border-t flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground text-[10px]">
                        {formatDate(lead.created_at)}
                      </span>

                      <div className="flex items-center gap-1">
                        {can('leads:convert') && (
                          lead.status !== 'converted' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConvert(lead.id);
                              }}
                              className="flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60 rounded-md font-semibold transition-colors shadow-2xs"
                              title="Tạo hồ sơ Casting Diễn viên từ học viên này"
                            >
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span>Convert</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-rose-600 font-semibold px-2 py-0.5 bg-rose-50 rounded">
                              Đã nhập học
                            </span>
                          )
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLead ? onSelectLead(lead) : onEditLead(lead);
                          }}
                          className="p-1 hover:bg-brand-50 text-muted-foreground hover:text-brand-600 rounded transition-colors"
                          title="Xem hồ sơ & lộ trình học viên"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {can('leads:write') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditLead(lead);
                            }}
                            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                            title="Sửa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {can('leads:delete') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Bạn có chắc chắn muốn xóa lead ${lead.full_name}?`)) {
                                deleteLead(lead.id);
                              }
                            }}
                            className="p-1 hover:bg-rose-50 text-muted-foreground hover:text-rose-600 rounded transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
