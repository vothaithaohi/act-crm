'use client';

import React, { useState } from 'react';
import { X, UserPlus, Phone, Mail, BookOpen, FileText } from 'lucide-react';
import { Lead, LeadSource, LeadStatus, normalizeLeadStatus } from '@/lib/types/crm';
import { useCRM } from '@/lib/store/crm-context';

interface LeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  leadToEdit?: Lead | null;
}

export function LeadDialog({ isOpen, onClose, leadToEdit }: LeadDialogProps) {
  const { addLead, updateLead, teamMembers } = useCRM();

  const [fullName, setFullName] = useState(leadToEdit?.full_name || '');
  const [phone, setPhone] = useState(leadToEdit?.phone || '');
  const [email, setEmail] = useState(leadToEdit?.email || '');
  const [courseInterest, setCourseInterest] = useState(
    leadToEdit?.course_interest || 'Khóa Diễn xuất Điện ảnh Chuyên sâu (ACT Pro)'
  );
  const [source, setSource] = useState<LeadSource>(leadToEdit?.source || 'manual');
  const [notes, setNotes] = useState(leadToEdit?.notes || '');
  const [status, setStatus] = useState<LeadStatus>(normalizeLeadStatus(leadToEdit?.status));
  const [assignedTo, setAssignedTo] = useState(leadToEdit?.assigned_to || '');
  const [tuitionFee, setTuitionFee] = useState<number>(Number(leadToEdit?.tuition_fee) || 16500000);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Vui lòng nhập Họ tên học viên!');
      return;
    }

    if (leadToEdit) {
      updateLead({
        ...leadToEdit,
        full_name: fullName,
        phone,
        email,
        course_interest: courseInterest,
        source,
        notes,
        status,
        assigned_to: assignedTo || undefined,
        tuition_fee: tuitionFee
      });
    } else {
      addLead({
        full_name: fullName,
        phone,
        email,
        course_interest: courseInterest,
        source,
        notes,
        status,
        assigned_to: assignedTo || undefined,
        tuition_fee: tuitionFee
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {leadToEdit ? 'Chỉnh sửa Học viên Tiềm năng' : 'Thêm Học viên Tiềm năng Mới'}
              </h3>
              <p className="text-xs text-muted-foreground">Nhập thông tin tiếp nhận tuyển sinh</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Họ và tên học viên <span className="text-brand-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Nguyễn Văn An"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Số điện thoại <span className="text-brand-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="tel"
                  required
                  placeholder="0912 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="hocvien@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Nguồn tiếp nhận
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
                className="w-full px-3.5 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
              >
                <option value="manual">Thủ công / Trực tiếp</option>
                <option value="meta_ads">Meta Ads (Facebook/IG)</option>
                <option value="website_form">Form Đăng ký Website</option>
                <option value="referral">Giới thiệu / Hotline</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Trạng thái tuyển sinh
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="w-full px-3.5 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium"
              >
                <option value="intake">1. Tiếp nhận ban đầu (Intake)</option>
                <option value="qualified">2. Đạt tiêu chuẩn (Qualified)</option>
                <option value="contacted">3. Đã liên hệ (Contacted)</option>
                <option value="considering">4. Đang cân nhắc (Considering)</option>
                <option value="trial_in_person">5. Học thử / Audition (Trial)</option>
                <option value="follow_up_later">6. Chăm sóc lại sau (Follow up)</option>
                <option value="converted">7. Đã nhập học (Converted)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Nhân viên phụ trách tư vấn
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
              >
                <option value="">-- Chưa phân công --</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.department || m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Học phí dự kiến / ghi nhận (VNĐ)
              </label>
              <input
                type="number"
                step="500000"
                placeholder="16500000"
                value={tuitionFee}
                onChange={(e) => setTuitionFee(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Khóa học quan tâm / Mục đích học
            </label>
            <div className="relative">
              <BookOpen className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="VD: Diễn xuất chuyên nghiệp, Bổ sung kỹ năng, Khóa ACT1..."
                value={courseInterest}
                onChange={(e) => setCourseInterest(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Ghi chú tuyển sinh & Lịch sử tư vấn
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <textarea
                rows={3}
                placeholder="Ghi chú về thời gian học, kinh nghiệm diễn xuất trước đó, nguyện vọng..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-xs"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border hover:bg-muted transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-lg shadow-sm shadow-brand-500/20 transition-all hover:scale-[1.02]"
            >
              {leadToEdit ? 'Lưu Thay Đổi' : 'Tạo Học Viên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
