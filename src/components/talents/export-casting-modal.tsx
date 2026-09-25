'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Copy, 
  Check, 
  Download, 
  Share2, 
  Send,
  Users,
  GraduationCap
} from 'lucide-react';
import { TalentProfile } from '@/lib/types/crm';
import { calculateAge, formatPhoneNumber } from '@/lib/utils';
import { toast } from 'sonner';

interface ExportCastingModalProps {
  isOpen: boolean;
  onClose: () => void;
  talents: TalentProfile[];
}

export function ExportCastingModal({ isOpen, onClose, talents }: ExportCastingModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateSummaryText = () => {
    const header = `🎬 DANH SÁCH DIỄN VIÊN ĐỀ XUẤT CASTING - ACT ACADEMY
📅 Thời gian xuất: ${new Date().toLocaleDateString('vi-VN')}
👥 Số lượng diễn viên: ${talents.length}
🌐 Tra cứu hồ sơ trực tuyến: https://crm.timviecremote.com/talents
==================================================\n\n`;

    const body = talents.map((t, index) => {
      const age = calculateAge(t.dob);
      const highestLevel = t.academic_profile?.highest_act_level || 'ACT1';
      const highestCode = t.academic_profile?.highest_class_code || highestLevel;
      const gender = t.gender === 'female' ? 'Nữ' : t.gender === 'male' ? 'Nam' : 'Khác';
      const measurements = [
        t.height_cm ? `Cao: ${t.height_cm}cm` : null,
        t.weight_kg ? `Nặng: ${t.weight_kg}kg` : null,
        t.chest_cm && t.waist_cm && t.hip_cm ? `Số đo: ${t.chest_cm}-${t.waist_cm}-${t.hip_cm}` : null
      ].filter(Boolean).join(' | ');

      const accents = (t.vietnamese_accents || []).map(a => `Giọng ${a.accent}`).join(', ');
      const languages = (t.languages || []).map(l => l.language).join(', ');
      const instruments = (t.instruments || []).map(i => i.name || i.style).join(', ');
      const martial = (t.martial_arts || []).map(m => m.style || m.name).join(', ');
      const dance = (t.dancing || []).map(d => d.style || d.name).join(', ');
      const sports = (t.sports || []).map(s => s.name || s.style).join(', ');

      const skillsList = [
        instruments ? `Nhạc cụ: ${instruments}` : null,
        martial ? `Võ thuật: ${martial}` : null,
        dance ? `Vũ đạo: ${dance}` : null,
        sports ? `Thể thao: ${sports}` : null
      ].filter(Boolean).join(' • ');

      const profileUrl = `https://crm.timviecremote.com/talents/${t.id}`;
      const headshotUrl = t.headshot_url || 'Chưa cập nhật ảnh';

      return `[${index + 1}] ${t.full_name.toUpperCase()} (${gender} - ${age ? `${age} tuổi` : 'N/A'})
🎓 Lớp ACT cao nhất: ${highestCode} (${highestLevel})
📏 Hình thể: ${measurements || 'Chưa cập nhật'}
🗣️ Giọng & Ngôn ngữ: ${[accents, languages].filter(Boolean).join(' | ') || 'Tiếng Việt'}
⭐ Kỹ năng nổi bật: ${skillsList || 'Diễn xuất biểu cảm, độc thoại'}
📍 Nơi làm việc: ${(t.willing_work_cities || ['TP.HCM']).join(', ')}
🔗 Xem hồ sơ & Comp-Card: ${profileUrl}
🖼️ Ảnh Headshot: ${headshotUrl}
--------------------------------------------------`;
    }).join('\n\n');

    const footer = `\n\nACT ACADEMY - BỘ PHẬN TUYỂN VAI & CASTING MATCHING
Hotline: 0901 234 567 | Email: casting@act.edu.vn`;

    return header + body + footer;
  };

  const summaryText = generateSummaryText();

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    toast.success(`Đã sao chép danh sách ${talents.length} diễn viên!`, {
      description: 'Bạn có thể dán (Paste) ngay vào Zalo hoặc Email gửi cho Đạo diễn / NSX.'
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `Danh_Sach_Casting_ACT_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Đã tải xuống file văn bản danh sách Casting!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-slate-900 to-rose-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-rose-500 flex items-center justify-center text-white shadow-md">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-white">
                  Xuất Danh Sách Tuyển Vai (Casting Summary)
                </h3>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-white">
                  Đã chọn: {talents.length} diễn viên
                </span>
              </div>
              <p className="text-xs text-rose-200">
                Định dạng tóm tắt chuẩn mực để gửi trực tiếp cho Đạo diễn & Nhà sản xuất qua Zalo/Email
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Talents Preview Strip */}
        <div className="p-3 border-b bg-muted/40 overflow-x-auto flex items-center gap-2.5 shrink-0">
          {talents.map((t) => (
            <div 
              key={t.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-card border shrink-0 shadow-2xs"
            >
              <img
                src={t.headshot_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'}
                alt={t.full_name}
                className="w-7 h-7 rounded-lg object-cover"
              />
              <div className="text-left">
                <div className="font-bold text-xs line-clamp-1">{t.full_name}</div>
                <div className="text-[10px] text-brand-600 font-semibold flex items-center gap-1">
                  <span>🎓 {t.academic_profile?.highest_class_code || 'ACT1'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Text Area Preview */}
        <div className="flex-1 overflow-y-auto p-4 bg-muted/20">
          <div className="relative">
            <textarea
              readOnly
              rows={14}
              value={summaryText}
              className="w-full p-4 font-mono text-xs rounded-xl border bg-card text-foreground focus:outline-none resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-card flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground">
            💡 <span className="font-semibold">Mẹo:</span> Nhấn nút "Sao chép" rồi mở cửa sổ chat Zalo với Đạo diễn để gửi ngay.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-muted transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải File .txt</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-rose-600 hover:from-brand-700 hover:to-rose-700 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Đã Sao Chép!' : 'Sao Chép Gửi Zalo / Email'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
