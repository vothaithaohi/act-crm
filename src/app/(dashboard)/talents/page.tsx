'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  UserPlus, 
  RotateCcw, 
  Film, 
  SlidersHorizontal,
  Layers,
  Award
} from 'lucide-react';
import { useCRM } from '@/lib/store/crm-context';
import { TalentFilterSidebar } from '@/components/talents/talent-filter-sidebar';
import { TalentCard } from '@/components/talents/talent-card';

export default function TalentsPage() {
  const { filteredTalents, talents, resetFilters } = useCRM();

  return (
    <div className="space-y-6">
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

        <div className="flex items-center gap-3">
          <Link
            href="/talents/new"
            className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-rose-600 hover:from-brand-700 hover:to-rose-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tạo Hồ Sơ Casting Mới</span>
          </Link>
        </div>
      </div>

      {/* Main Casting Engine Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Filter Sidebar */}
        <TalentFilterSidebar />

        {/* Right Talent Cards Grid */}
        <div className="flex-1 w-full space-y-4">
          {/* Quick Header Bar */}
          <div className="flex items-center justify-between bg-card p-3.5 rounded-xl border shadow-2xs">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-foreground">
                Đang hiển thị {filteredTalents.length} diễn viên
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">Kho dữ liệu: {talents.length} hồ sơ ACT</span>
            </div>

            <div className="text-xs text-muted-foreground">
              Sắp xếp: <span className="font-medium text-foreground">Mới cập nhật</span>
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
                <TalentCard key={talent.id} talent={talent} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
