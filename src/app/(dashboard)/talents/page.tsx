'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  UserPlus, 
  RotateCcw, 
  Film, 
  SlidersHorizontal,
  Layers,
  Award,
  Share2,
  CheckSquare,
  Square,
  Send,
  X
} from 'lucide-react';
import { useCRM } from '@/lib/store/crm-context';
import { TalentFilterSidebar } from '@/components/talents/talent-filter-sidebar';
import { TalentCard } from '@/components/talents/talent-card';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { ExportCastingModal } from '@/components/talents/export-casting-modal';

export default function TalentsPage() {
  const { filteredTalents, talents, resetFilters, can } = useCRM();
  const [selectedTalentIds, setSelectedTalentIds] = useState<string[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleToggleSelect = (id: string) => {
    setSelectedTalentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedTalentIds.length === filteredTalents.length) {
      setSelectedTalentIds([]);
    } else {
      setSelectedTalentIds(filteredTalents.map(t => t.id));
    }
  };

  const handleDeselectAll = () => {
    setSelectedTalentIds([]);
  };

  const selectedTalents = talents.filter(t => selectedTalentIds.includes(t.id));

  return (
    <PermissionGuard
      permission="talents:read"
      customTitle="Kho Diễn Viên & Casting Matching"
      customMessage="Bạn không có quyền truy cập vào Talent Pool và hồ sơ diễn viên của ACT Academy."
    >
      <div className="space-y-6 pb-20">
        {/* Top Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-amber-500" />
              <span>Casting Matching Engine (Talent Directory)</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Bộ lọc đa tiêu chí nhân trắc học, kỹ năng, giọng nói và mức độ sẵn sàng vai diễn cho Đạo diễn & Nhà sản xuất
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {can('talents:export') && (
              <button
                onClick={() => setIsExportModalOpen(true)}
                disabled={selectedTalents.length === 0}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-rose-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                <Share2 className="w-4 h-4" />
                <span>Xuất Danh Sách Casting ({selectedTalents.length})</span>
              </button>
            )}

            {can('talents:write') && (
              <Link
                href="/talents/new"
                className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-rose-600 hover:from-brand-700 hover:to-rose-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Tạo Hồ Sơ Casting Mới</span>
              </Link>
            )}
          </div>
        </div>

        {/* Main Casting Engine Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Filter Sidebar */}
          <TalentFilterSidebar />

          {/* Right Talent Cards Grid */}
          <div className="flex-1 w-full space-y-4">
            {/* Quick Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3.5 rounded-xl border shadow-2xs">
              <div className="flex items-center gap-3 text-xs">
                {can('talents:export') && filteredTalents.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1 rounded-md transition-colors"
                  >
                    {selectedTalentIds.length === filteredTalents.length && filteredTalents.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-brand-600" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span>
                      {selectedTalentIds.length === filteredTalents.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả kết quả'}
                    </span>
                  </button>
                )}

                <span className="text-muted-foreground">•</span>
                <span className="font-semibold text-foreground">
                  Đang hiển thị {filteredTalents.length} diễn viên
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">Kho dữ liệu: {talents.length} hồ sơ ACT</span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {selectedTalents.length > 0 && (
                  <span className="text-brand-600 font-bold bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded-md border border-brand-200/50">
                    Đã tích chọn {selectedTalents.length}
                  </span>
                )}
                <span className="text-muted-foreground">Sắp xếp:</span>
                <span className="font-medium text-foreground">Mới cập nhật</span>
              </div>
            </div>

            {/* Cards Grid */}
            {filteredTalents.length === 0 ? (
              <div className="p-16 bg-card rounded-2xl border text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <SlidersHorizontal className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base">Không tìm thấy diễn viên phù hợp</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Không có diễn viên nào thỏa mãn tất cả các tiêu chí lọc hiện tại. Thử nới lỏng chiều cao, độ tuổi hoặc kỹ năng đặc thù.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-lg text-xs font-semibold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xóa Tất Cả Bộ Lọc</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredTalents.map((talent) => (
                  <TalentCard 
                    key={talent.id} 
                    talent={talent} 
                    isSelected={selectedTalentIds.includes(talent.id)}
                    onToggleSelect={handleToggleSelect}
                    selectable={can('talents:export')}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Floating Bottom Bar When Talents are Selected */}
        {selectedTalents.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold">
                Đã chọn {selectedTalents.length} diễn viên
              </span>
            </div>

            <div className="h-4 w-px bg-white/20"></div>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-rose-500 hover:from-brand-600 hover:to-rose-600 text-white text-xs font-bold shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Xuất Tóm Tắt Gửi Đạo Diễn / NSX (Zalo / Email)</span>
            </button>

            <button
              onClick={handleDeselectAll}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
              title="Bỏ chọn tất cả"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Export Casting Modal */}
        <ExportCastingModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          talents={selectedTalents.length > 0 ? selectedTalents : filteredTalents.slice(0, 10)}
        />
      </div>
    </PermissionGuard>
  );
}
