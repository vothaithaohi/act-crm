'use client';

import React from 'react';
import Link from 'next/link';
import { TalentProfile } from '@/lib/types/crm';
import { calculateAge } from '@/lib/utils';
import { Sparkles, MapPin, Film, Eye, Edit3, HeartHandshake, Mic, GraduationCap, Check } from 'lucide-react';
import { useCRM } from '@/lib/store/crm-context';

interface TalentCardProps {
  talent: TalentProfile;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  selectable?: boolean;
}

export function TalentCard({ talent, isSelected = false, onToggleSelect, selectable = true }: TalentCardProps) {
  const { can } = useCRM();
  const age = calculateAge(talent.dob);

  // Key skills highlight
  const accents = (talent.vietnamese_accents || []).map(a => `Giọng ${a.accent}`).slice(0, 2);
  const langs = (talent.languages || []).map(l => l.language).filter(l => l !== 'Tiếng Việt').slice(0, 2);
  const instruments = (talent.instruments || []).map(i => i.name || i.style).slice(0, 1);
  const martial = (talent.martial_arts || []).map(m => m.style || m.name).slice(0, 1);
  const allSkills = [...accents, ...langs, ...instruments, ...martial].filter(Boolean);

  const willingnessBadges: Record<string, string> = {
    kissing_scene: 'Cảnh hôn',
    swimsuit: 'Đồ bơi',
    lingerie: 'Nội y',
    partial_nudity: 'Bán khỏa thân',
    hair_color: 'Nhuộm tóc',
    cut_hair: 'Cắt tóc'
  };

  const highestLevel = talent.academic_profile?.highest_act_level;
  const highestCode = talent.academic_profile?.highest_class_code || highestLevel;

  return (
    <div className={`bg-card rounded-2xl border shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col group relative ${
      isSelected 
        ? 'ring-2 ring-brand-500 border-brand-500 shadow-md bg-brand-50/5 dark:bg-brand-950/20' 
        : 'border-border/80 hover:border-brand-500/40'
    }`}>
      {/* Top Image Card */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        <img
          src={talent.headshot_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'}
          alt={talent.full_name}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5">
            {selectable && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect?.(talent.id);
                }}
                className={`w-6 h-6 rounded-md flex items-center justify-center transition-all shadow-md ${
                  isSelected
                    ? 'bg-brand-500 text-white ring-2 ring-white/80'
                    : 'bg-black/50 hover:bg-black/70 text-white/70 hover:text-white border border-white/30 backdrop-blur-md'
                }`}
                title={isSelected ? 'Bỏ chọn' : 'Chọn diễn viên này'}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            )}

            {/* Gender Badge */}
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full backdrop-blur-md shadow-xs ${
              talent.gender === 'female' 
                ? 'bg-rose-500/90 text-white' 
                : 'bg-blue-600/90 text-white'
            }`}>
              {talent.gender === 'female' ? 'Nữ' : talent.gender === 'male' ? 'Nam' : 'Khác'}
            </span>
          </div>

          {/* Highest ACT Level Badge */}
          {highestLevel && (
            <span className={`text-[10px] font-bold tracking-wide px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-md border ${
              highestLevel === 'ACT4'
                ? 'bg-gradient-to-r from-purple-600 to-rose-600 text-white border-purple-400/60 ring-1 ring-white/20'
                : highestLevel === 'ACT3'
                ? 'bg-emerald-600 text-white border-emerald-400/60'
                : highestLevel === 'ACT2'
                ? 'bg-blue-600 text-white border-blue-400/60'
                : 'bg-amber-600 text-white border-amber-400/60'
            }`}>
              🎓 {highestCode}
            </span>
          )}
        </div>

        {/* Cities Badge */}
        {talent.willing_work_cities && talent.willing_work_cities.length > 0 && (
          <div className="absolute top-10 right-3 flex items-center gap-1 text-[9px] font-medium bg-black/60 backdrop-blur-md text-white/90 px-2 py-0.5 rounded-full">
            <MapPin className="w-2.5 h-2.5 text-rose-400" />
            <span>{talent.willing_work_cities[0]}</span>
          </div>
        )}

        {/* Floating Info on Image Bottom */}
        <div className="absolute bottom-3 left-3 right-3 text-white space-y-1">
          <div className="flex items-baseline justify-between">
            <h4 className="font-bold text-base leading-tight drop-shadow-sm group-hover:text-rose-200 transition-colors">
              {talent.full_name}
            </h4>
            {age !== null && (
              <span className="text-xs text-white/80 font-medium">
                {age} tuổi
              </span>
            )}
          </div>

          {/* Measurements summary */}
          <div className="flex items-center gap-2 text-[11px] text-white/90 font-medium">
            {talent.height_cm && <span>{talent.height_cm} cm</span>}
            {talent.height_cm && talent.weight_kg && <span>•</span>}
            {talent.weight_kg && <span>{talent.weight_kg} kg</span>}
            {talent.chest_cm && talent.waist_cm && talent.hip_cm && (
              <>
                <span>•</span>
                <span>{talent.chest_cm}-{talent.waist_cm}-{talent.hip_cm}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-card">
        {/* Academic Level Info Highlight */}
        {highestLevel && (
          <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-muted/50 border border-border/60">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <GraduationCap className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <span className="text-muted-foreground text-[10px]">Lớp cao nhất:</span>
              <span className={`font-bold text-xs ${
                highestLevel === 'ACT4' ? 'text-purple-600 dark:text-purple-400' :
                highestLevel === 'ACT3' ? 'text-emerald-600 dark:text-emerald-400' :
                highestLevel === 'ACT2' ? 'text-blue-600 dark:text-blue-400' :
                'text-amber-600 dark:text-amber-400'
              }`}>
                {highestCode}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border">
              {talent.academic_profile?.total_courses_count || 1} Term
            </span>
          </div>
        )}

        {/* Skills & Accents Tags */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {allSkills.slice(0, 3).map((s, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-md"
              >
                {s}
              </span>
            ))}
          </div>

          {/* Role Willingness */}
          {talent.role_willingness && talent.role_willingness.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {talent.role_willingness.slice(0, 3).map((w) => (
                <span
                  key={w}
                  className="text-[10px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200/50"
                >
                  ✓ {willingnessBadges[w] || w}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t flex items-center gap-2">
          <Link
            href={`/talents/${talent.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-all hover:scale-[1.02]"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Xem Hồ Sơ</span>
          </Link>

          {can('talents:export') && (
            <Link
              href={`/talents/${talent.id}#compcard`}
              className="px-2.5 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1"
              title="Xuất Comp-Card"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Comp-Card</span>
            </Link>
          )}

          {can('talents:write') && (
            <Link
              href={`/talents/${talent.id}/edit`}
              className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg border transition-colors"
              title="Sửa hồ sơ"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
