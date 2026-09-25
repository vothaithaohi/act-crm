'use client';

import React from 'react';
import { 
  Filter, 
  RotateCcw, 
  Sparkles, 
  Search, 
  SlidersHorizontal, 
  Check, 
  MapPin, 
  HeartHandshake, 
  Languages, 
  Flame, 
  Music, 
  Swords 
} from 'lucide-react';
import { useCRM } from '@/lib/store/crm-context';

export function TalentFilterSidebar() {
  const { filterCriteria, setFilterCriteria, resetFilters, filteredTalents, talents } = useCRM();

  const toggleArrayItem = (key: 'accents' | 'languages' | 'instruments' | 'martialArts' | 'danceStyles' | 'sports' | 'roleWillingness' | 'cities', value: string) => {
    setFilterCriteria(prev => {
      const arr = prev[key];
      const exists = arr.includes(value);
      return {
        ...prev,
        [key]: exists ? arr.filter(i => i !== value) : [...arr, value]
      };
    });
  };

  const toggleActLevel = (level: string) => {
    setFilterCriteria(prev => {
      const arr = prev.actLevels || [];
      const exists = arr.includes(level);
      return {
        ...prev,
        actLevels: exists ? arr.filter(i => i !== level) : [...arr, level]
      };
    });
  };

  const hasActiveFilters = 
    filterCriteria.gender !== 'all' ||
    Boolean(filterCriteria.searchQuery) ||
    Boolean(filterCriteria.actLevels && filterCriteria.actLevels.length > 0) ||
    filterCriteria.minAge !== undefined ||
    filterCriteria.maxAge !== undefined ||
    filterCriteria.minHeight !== undefined ||
    filterCriteria.maxHeight !== undefined ||
    filterCriteria.accents.length > 0 ||
    filterCriteria.languages.length > 0 ||
    filterCriteria.instruments.length > 0 ||
    filterCriteria.martialArts.length > 0 ||
    filterCriteria.roleWillingness.length > 0 ||
    filterCriteria.cities.length > 0;

  return (
    <div className="w-80 shrink-0 bg-card rounded-2xl border p-5 shadow-xs space-y-6 h-fit sticky top-20">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-brand-600" />
          <h3 className="font-bold text-sm tracking-tight">Smart Casting Filter</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Xóa lọc</span>
          </button>
        )}
      </div>

      {/* Results Count Badge */}
      <div className="p-2.5 bg-brand-50/60 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900/50 rounded-xl flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">Diễn viên phù hợp:</span>
        <span className="font-bold text-brand-600 text-sm">
          {filteredTalents.length} <span className="text-xs font-normal text-muted-foreground">/ {talents.length}</span>
        </span>
      </div>

      {/* Filter Sections */}
      <div className="space-y-5 text-xs max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
        {/* 1. Search Query */}
        <div>
          <label className="block font-semibold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
            Tìm theo Tên / Điện thoại
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="VD: Nguyễn Nhi, Long, Phúc..."
              value={filterCriteria.searchQuery}
              onChange={(e) => setFilterCriteria(p => ({ ...p, searchQuery: e.target.value }))}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border bg-background focus:border-brand-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* ACT Academic Level Filter */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Lớp ACT Đã Học
            </label>
            {filterCriteria.actLevels && filterCriteria.actLevels.length > 0 && (
              <span className="text-[10px] text-brand-600 font-semibold">
                Đã chọn {filterCriteria.actLevels.length}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'ACT4', label: 'ACT 4', badge: 'Masterclass', color: 'border-purple-300 bg-purple-50 text-purple-900 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' },
              { id: 'ACT3', label: 'ACT 3', badge: 'Ống kính', color: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' },
              { id: 'ACT2', label: 'ACT 2', badge: 'Tâm lý', color: 'border-blue-300 bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' },
              { id: 'ACT1', label: 'ACT 1', badge: 'Căn bản', color: 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' }
            ].map(item => {
              const active = (filterCriteria.actLevels || []).includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleActLevel(item.id)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-left transition-all ${
                    active 
                      ? `${item.color} font-bold shadow-xs ring-1 ring-brand-500` 
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border/80'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs">{item.label}</span>
                    <span className="text-[9px] opacity-75">{item.badge}</span>
                  </div>
                  {active && <Check className="w-3 h-3 text-brand-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Gender */}
        <div>
          <label className="block font-semibold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
            Giới tính diễn viên
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-muted/60 p-1 rounded-lg border">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'male', label: 'Nam' },
              { id: 'female', label: 'Nữ' },
            ].map(g => (
              <button
                key={g.id}
                onClick={() => setFilterCriteria(p => ({ ...p, gender: g.id }))}
                className={`py-1 rounded text-center font-medium transition-all ${
                  filterCriteria.gender === g.id
                    ? 'bg-card text-brand-600 font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Age Range */}
        <div>
          <label className="block font-semibold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
            Độ tuổi (Năm sinh)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Từ tuổi (VD: 18)"
              value={filterCriteria.minAge ?? ''}
              onChange={(e) => setFilterCriteria(p => ({ ...p, minAge: e.target.value ? Number(e.target.value) : undefined }))}
              className="w-1/2 px-2.5 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-brand-500"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="number"
              placeholder="Đến tuổi (VD: 30)"
              value={filterCriteria.maxAge ?? ''}
              onChange={(e) => setFilterCriteria(p => ({ ...p, maxAge: e.target.value ? Number(e.target.value) : undefined }))}
              className="w-1/2 px-2.5 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* 4. Height Range */}
        <div>
          <label className="block font-semibold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
            Chiều cao (cm)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min cm (VD: 165)"
              value={filterCriteria.minHeight ?? ''}
              onChange={(e) => setFilterCriteria(p => ({ ...p, minHeight: e.target.value ? Number(e.target.value) : undefined }))}
              className="w-1/2 px-2.5 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-brand-500"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="number"
              placeholder="Max cm (VD: 185)"
              value={filterCriteria.maxHeight ?? ''}
              onChange={(e) => setFilterCriteria(p => ({ ...p, maxHeight: e.target.value ? Number(e.target.value) : undefined }))}
              className="w-1/2 px-2.5 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* 5. Accents */}
        <div>
          <label className="block font-semibold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
            Giọng nói Vùng Miền
          </label>
          <div className="flex flex-wrap gap-1.5">
            {['Nam', 'Bắc', 'Trung', 'Huế'].map(acc => {
              const active = filterCriteria.accents.includes(acc);
              return (
                <button
                  key={acc}
                  onClick={() => toggleArrayItem('accents', acc)}
                  className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
                    active
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  }`}
                >
                  Giọng {acc}
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. Languages */}
        <div>
          <label className="block font-semibold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
            Ngoại ngữ diễn xuất
          </label>
          <div className="flex flex-wrap gap-1.5">
            {['Tiếng Anh', 'Tiếng Hàn', 'Tiếng Trung', 'Tiếng Nhật', 'Tiếng Pháp'].map(lang => {
              const active = filterCriteria.languages.includes(lang);
              return (
                <button
                  key={lang}
                  onClick={() => toggleArrayItem('languages', lang)}
                  className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
                    active
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        </div>

        {/* 7. Special Skills: Martial Arts & Instruments */}
        <div>
          <label className="block font-semibold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
            Võ thuật & Hành động
          </label>
          <div className="flex flex-wrap gap-1.5">
            {['Boxing', 'Vovinam', 'Taekwondo', 'Karate'].map(art => {
              const active = filterCriteria.martialArts.includes(art);
              return (
                <button
                  key={art}
                  onClick={() => toggleArrayItem('martialArts', art)}
                  className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
                    active
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {art}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block font-semibold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
            Nhạc cụ biểu diễn
          </label>
          <div className="flex flex-wrap gap-1.5">
            {['Guitar', 'Piano', 'Trống', 'Ukulele'].map(inst => {
              const active = filterCriteria.instruments.includes(inst);
              return (
                <button
                  key={inst}
                  onClick={() => toggleArrayItem('instruments', inst)}
                  className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
                    active
                      ? 'bg-indigo-500 text-white border-indigo-500'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {inst}
                </button>
              );
            })}
          </div>
        </div>

        {/* 8. Role Willingness */}
        <div>
          <label className="block font-semibold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
            Mức độ Sẵn sàng cho Vai diễn
          </label>
          <div className="space-y-1.5">
            {[
              { id: 'kissing_scene', label: 'Sẵn sàng cảnh hôn' },
              { id: 'swimsuit', label: 'Mặc đồ bơi / Bikini' },
              { id: 'lingerie', label: 'Trang phục nội y' },
              { id: 'partial_nudity', label: 'Bán khỏa thân nghệ thuật' },
              { id: 'hair_color', label: 'Sẵn sàng đổi màu tóc' },
              { id: 'cut_hair', label: 'Sẵn sàng cắt tóc ngắn' },
            ].map(w => {
              const active = filterCriteria.roleWillingness.includes(w.id);
              return (
                <label
                  key={w.id}
                  onClick={() => toggleArrayItem('roleWillingness', w.id)}
                  className="flex items-center gap-2 cursor-pointer hover:text-foreground text-muted-foreground py-0.5"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    active ? 'bg-brand-500 border-brand-500 text-white' : 'border-border'
                  }`}>
                    {active && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className={active ? 'font-semibold text-foreground' : ''}>{w.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 9. Shooting Cities */}
        <div>
          <label className="block font-semibold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
            Sẵn sàng quay tại tỉnh thành
          </label>
          <div className="flex flex-wrap gap-1.5">
            {['TP.HCM', 'Hà Nội', 'Đà Nẵng', 'Miền Tây', 'Hạ Long'].map(city => {
              const active = filterCriteria.cities.includes(city);
              return (
                <button
                  key={city}
                  onClick={() => toggleArrayItem('cities', city)}
                  className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
                    active
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {city}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
