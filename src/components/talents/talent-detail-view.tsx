'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  TalentProfile, 
  FilmRole, 
  CommercialRole, 
  MusicVideoRole,
  ACT_LEVEL_DETAILS,
  ACTCourseLevel 
} from '@/lib/types/crm';
import { calculateAge, formatPhoneNumber } from '@/lib/utils';
import { useCRM } from '@/lib/store/crm-context';
import { TalentCompCard } from '@/components/talents/talent-comp-card';
import { 
  User, 
  Ruler, 
  Clapperboard, 
  Sparkles, 
  MapPin, 
  Image as ImageIcon, 
  Edit3, 
  Trash2, 
  Phone, 
  Mail, 
  Film, 
  ArrowLeft,
  Share2,
  CheckCircle2,
  Music,
  Swords,
  HeartHandshake,
  GraduationCap,
  Award,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  ShieldCheck,
  Clock,
  Lock
} from 'lucide-react';

interface TalentDetailViewProps {
  talent: TalentProfile;
}

export function TalentDetailView({ talent }: TalentDetailViewProps) {
  const { deleteTalent, can } = useCRM();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'academic' | 'compcard'>('profile');

  const age = calculateAge(talent.dob);
  const highestLevel = talent.academic_profile?.highest_act_level;
  const highestCode = talent.academic_profile?.highest_class_code || highestLevel;

  const handleDelete = () => {
    if (confirm(`Bạn có chắc muốn xóa hồ sơ của ${talent.full_name}?`)) {
      deleteTalent(talent.id);
      router.push('/talents');
    }
  };

  const exp = talent.acting_experience || {
    feature_films: [],
    short_films: [],
    tv_shows: [],
    web_dramas: [],
    commercials: [],
    music_videos: []
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/talents"
            className="w-9 h-9 rounded-xl border bg-card hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {talent.full_name}
              </h1>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                talent.gender === 'female' 
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' 
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
              }`}>
                {talent.gender === 'female' ? 'Nữ' : 'Nam'}
              </span>

              {/* Prominent Highest ACT Level Badge */}
              {highestLevel && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full border shadow-xs flex items-center gap-1.5 ${
                  highestLevel === 'ACT4'
                    ? 'bg-gradient-to-r from-purple-100 to-rose-100 text-purple-900 border-purple-300 dark:from-purple-950/80 dark:to-rose-950/80 dark:text-purple-200 dark:border-purple-700 font-extrabold ring-1 ring-purple-500/20'
                    : highestLevel === 'ACT3'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700'
                    : highestLevel === 'ACT2'
                    ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-700'
                    : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700'
                }`}>
                  <GraduationCap className="w-4 h-4 text-brand-600 shrink-0" />
                  <span>Cấp độ cao nhất: <strong>{highestCode}</strong></span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              ID: {talent.id.slice(0, 8)} • Ngày tạo: {new Date(talent.created_at || '').toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Tab Selector */}
          <div className="flex items-center bg-muted p-1 rounded-lg border">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'profile' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Hồ Sơ 6 Phần</span>
            </button>

            <button
              onClick={() => setActiveTab('academic')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'academic' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
              <span>Học Trình ACT</span>
              {highestLevel && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-500/10 text-brand-600 font-bold border border-brand-500/20">
                  {highestCode}
                </span>
              )}
            </button>

            {can('talents:export') && (
              <button
                onClick={() => setActiveTab('compcard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'compcard' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Xuất Comp-Card</span>
              </button>
            )}
          </div>

          {can('talents:write') && (
            <Link
              href={`/talents/${talent.id}/edit`}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Sửa Hồ Sơ</span>
            </Link>
          )}

          {can('talents:delete') && (
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-rose-50 text-muted-foreground hover:text-rose-600 rounded-lg border transition-colors"
              title="Xóa hồ sơ"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {activeTab === 'compcard' ? (
        <TalentCompCard talent={talent} />
      ) : activeTab === 'academic' ? (
        /* Academic Profile & Journey View */
        <div className="space-y-6">
          {/* Top Hero Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-bold uppercase tracking-wider">
                  <GraduationCap className="w-4 h-4 text-brand-400" />
                  <span>Học Trình Đào Tạo Diễn Xuất ACT Academy</span>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                      {talent.full_name}
                    </h2>
                    {highestLevel && (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border shadow-sm ${
                        highestLevel === 'ACT4'
                          ? 'bg-gradient-to-r from-purple-500 to-rose-500 text-white border-purple-400 font-extrabold shadow-purple-500/20'
                          : highestLevel === 'ACT3'
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : highestLevel === 'ACT2'
                          ? 'bg-blue-600 text-white border-blue-400'
                          : 'bg-amber-600 text-white border-amber-400'
                      }`}>
                        🎓 Cấp độ cao nhất: {highestCode}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-brand-300">
                    {highestLevel ? ACT_LEVEL_DETAILS[highestLevel]?.fullName : 'Học viên chưa phân cấp'}
                  </p>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {highestLevel 
                    ? ACT_LEVEL_DETAILS[highestLevel]?.description 
                    : 'Học viên mới gia nhập cơ sở dữ liệu học tập của học viện.'}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 shrink-0 sm:w-80">
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Lớp cao nhất</span>
                  <span className="text-xl font-black text-brand-400">{highestCode || '—'}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 capitalize">
                    {talent.academic_profile?.highest_level_status === 'studying' ? '⏳ Đang học' : '✓ Tốt nghiệp'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Tổng số Term</span>
                  <span className="text-xl font-black text-white">
                    {talent.academic_profile?.total_courses_count || (talent.academic_profile?.enrollments || []).length || 1}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Khóa đã theo học</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 col-span-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">Chứng chỉ ACT</span>
                      <span className="text-[10px] text-emerald-300">Đã kiểm duyệt chuyên môn</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30">
                    Đạt chuẩn
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Stage Learning Roadmap Progression */}
          <div className="bg-card rounded-2xl border p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-brand-600" />
                <div>
                  <h3 className="font-bold text-base text-foreground">Lộ Trình Đào Tạo 4 Cấp Độ Diễn Xuất ACT</h3>
                  <p className="text-xs text-muted-foreground">Theo dõi tiến trình từ Nền tảng căn bản đến Điện ảnh chuyên nghiệp</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {(['ACT1', 'ACT2', 'ACT3', 'ACT4'] as ACTCourseLevel[]).map((lvl, idx) => {
                const info = ACT_LEVEL_DETAILS[lvl];
                const matchingEnrollment = (talent.academic_profile?.enrollments || []).find(e => e.level === lvl);
                const isCompleted = matchingEnrollment?.status === 'completed';
                const isStudying = matchingEnrollment?.status === 'studying';
                const hasTaken = Boolean(matchingEnrollment);

                return (
                  <div 
                    key={lvl}
                    className={`rounded-2xl p-4 border transition-all relative flex flex-col justify-between ${
                      isCompleted 
                        ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800'
                        : isStudying
                        ? 'bg-blue-50/50 border-blue-400 dark:bg-blue-950/30 dark:border-blue-700 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-muted/30 border-dashed border-border opacity-70'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Step Header */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          isCompleted
                            ? 'bg-emerald-600 text-white'
                            : isStudying
                            ? 'bg-blue-600 text-white animate-pulse'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          Bước {idx + 1} • {info.label}
                        </span>

                        {isCompleted ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <Check className="w-3.5 h-3.5" /> Hoàn thành
                          </span>
                        ) : isStudying ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                            <Clock className="w-3.5 h-3.5 animate-spin" /> Đang học
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Mục tiêu
                          </span>
                        )}
                      </div>

                      {/* Course Title */}
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{info.fullName}</h4>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                          {info.description}
                        </p>
                      </div>
                    </div>

                    {/* Footer Info of Stage */}
                    <div className="pt-3 border-t border-border/60 mt-3 text-xs">
                      {hasTaken && matchingEnrollment ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between font-semibold text-foreground">
                            <span>Lớp: {matchingEnrollment.class_code}</span>
                            <span className="text-[10px] font-normal text-muted-foreground">
                              {matchingEnrollment.term_name}
                            </span>
                          </div>
                          {matchingEnrollment.start_date && (
                            <span className="text-[10px] text-muted-foreground block">
                              Thời gian: {matchingEnrollment.start_date} {matchingEnrollment.end_date ? `➔ ${matchingEnrollment.end_date}` : ''}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
                          Chưa đăng ký khóa học này
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Term History */}
          <div className="bg-card rounded-2xl border p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-600" />
                <h3 className="font-bold text-base text-foreground">
                  Lịch Sử Các Term & Lớp Đã Học ({talent.academic_profile?.enrollments?.length || 0})
                </h3>
              </div>
              {can('talents:write') && (
                <Link
                  href={`/talents/${talent.id}/edit`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Cập nhật học trình</span>
                </Link>
              )}
            </div>

            {(!talent.academic_profile?.enrollments || talent.academic_profile.enrollments.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground text-xs space-y-2">
                <GraduationCap className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                <p>Chưa có lịch sử term nào được ghi nhận cho học viên này.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {talent.academic_profile.enrollments.map((enr, idx) => {
                  const info = ACT_LEVEL_DETAILS[enr.level] || ACT_LEVEL_DETAILS.ACT1;
                  return (
                    <div 
                      key={enr.id || idx}
                      className="p-4 rounded-xl border bg-card hover:bg-muted/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${info.badgeClass}`}>
                          {enr.level}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-foreground">
                              {enr.class_code}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              • {enr.term_name}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              enr.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : enr.status === 'studying'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                : enr.status === 'reserved'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {enr.status === 'completed' ? '✓ Đã tốt nghiệp' :
                               enr.status === 'studying' ? '⏳ Đang theo học' :
                               enr.status === 'reserved' ? 'Bảo lưu' : 'Đã dừng / Chuyển'}
                            </span>
                          </div>

                          <p className="text-xs text-foreground font-medium">
                            {info.fullName}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-0.5">
                            {enr.start_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {enr.start_date} {enr.end_date ? `➔ ${enr.end_date}` : ''}
                              </span>
                            )}
                            {enr.instructor && (
                              <span>Giảng viên: <strong className="text-foreground">{enr.instructor}</strong></span>
                            )}
                          </div>

                          {enr.evaluation && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-muted/60 p-2 rounded-lg mt-2 border border-border/50">
                              💬 <em>&ldquo;{enr.evaluation}&rdquo;</em>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                        {enr.certificate_issued && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800">
                            <Sparkles className="w-3 h-3" />
                            Đã cấp chứng chỉ
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          Xếp loại: <strong>{enr.grade || 'Đạt'}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Actor Card & Photos & Quick Info */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border overflow-hidden shadow-xs">
              <div className="aspect-[3/4] relative bg-muted">
                <img
                  src={talent.headshot_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800'}
                  alt={talent.full_name}
                  className="w-full h-full object-cover object-top"
                />
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-foreground">{talent.full_name}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 text-brand-500" />
                    <span>{talent.city || 'TP.HCM'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                  <div className="p-2.5 bg-muted/50 rounded-xl">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Chiều cao</span>
                    <span className="font-bold text-sm text-foreground">{talent.height_cm || '—'} cm</span>
                  </div>
                  <div className="p-2.5 bg-muted/50 rounded-xl">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Cân nặng</span>
                    <span className="font-bold text-sm text-foreground">{talent.weight_kg || '—'} kg</span>
                  </div>
                  <div className="p-2.5 bg-muted/50 rounded-xl">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Số đo 3 vòng</span>
                    <span className="font-bold text-sm text-foreground">
                      {talent.chest_cm ? `${talent.chest_cm}-${talent.waist_cm}-${talent.hip_cm}` : '—'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-muted/50 rounded-xl">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Tuổi</span>
                    <span className="font-bold text-sm text-foreground">{age !== null ? `${age} tuổi` : '—'}</span>
                  </div>
                </div>

                {/* Contact info */}
                <div className="pt-2 border-t space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Phone className="w-3.5 h-3.5 text-brand-500" />
                    <span>{formatPhoneNumber(talent.phone)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{talent.email}</span>
                  </div>
                </div>

                {/* Social media links */}
                {talent.social_links && (
                  <div className="pt-2 border-t space-y-1.5 text-xs">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block">
                      Mạng Xã Hội
                    </span>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {talent.social_links.facebook && (
                        <a href={talent.social_links.facebook} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          Facebook
                        </a>
                      )}
                      {talent.social_links.instagram && (
                        <a href={talent.social_links.instagram} target="_blank" rel="noreferrer" className="text-rose-600 hover:underline">
                          Instagram
                        </a>
                      )}
                      {talent.social_links.tiktok && (
                        <a href={talent.social_links.tiktok} target="_blank" rel="noreferrer" className="text-slate-900 dark:text-white hover:underline">
                          TikTok
                        </a>
                      )}
                      {talent.social_links.showreel_url && (
                        <a href={talent.social_links.showreel_url} target="_blank" rel="noreferrer" className="text-amber-600 hover:underline font-semibold">
                          ▶ Showreel
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* ACT Academic Mini-Card */}
                {highestLevel && (
                  <div className="pt-2 border-t space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block">
                        Học Trình ACT Academy
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('academic')}
                        className="text-[11px] text-brand-600 font-semibold hover:underline flex items-center gap-0.5"
                      >
                        Chi tiết <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="p-3 rounded-xl bg-brand-500/5 border border-brand-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-brand-600" />
                          Lớp cao nhất:
                        </span>
                        <span className="text-xs font-bold text-brand-600 px-2 py-0.5 bg-brand-500/10 rounded-lg border border-brand-500/20">
                          {highestCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {ACT_LEVEL_DETAILS[highestLevel]?.fullName || 'Học viên diễn xuất ACT'}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-brand-500/10 text-[10px] text-muted-foreground">
                        <span>Đã học: <strong>{talent.academic_profile?.total_courses_count || 1} Term</strong></span>
                        <span className="capitalize font-medium text-emerald-600 dark:text-emerald-400">
                          {talent.academic_profile?.highest_level_status === 'studying' ? '⏳ Đang học' : '✓ Đã tốt nghiệp'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right 2 Columns: Detailed 6 Sections */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Thông tin cá nhân & Liên hệ */}
            <div className="bg-card rounded-2xl border p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground border-b pb-3">
                <User className="w-4 h-4 text-brand-500" />
                <span>Phần 1: Thông Tin Cá Nhân & Liên Hệ</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block">Họ và tên đầy đủ:</span>
                  <span className="font-semibold text-foreground text-sm">{talent.full_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Ngày sinh:</span>
                  <span className="font-semibold text-foreground">{talent.dob || 'Chưa cập nhật'} ({age} tuổi)</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Địa chỉ:</span>
                  <span className="font-semibold text-foreground">{talent.address ? `${talent.address}, ${talent.city || ''}` : talent.city || 'TP.HCM'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Người giám hộ (nếu &lt;18):</span>
                  <span className="font-semibold text-foreground">{talent.parent_guardian_name || 'Không áp dụng'}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Nhân trắc học & Số đo */}
            <div className="bg-card rounded-2xl border p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground border-b pb-3">
                <Ruler className="w-4 h-4 text-indigo-500" />
                <span>Phần 2: Nhân Trắc Học & Số Đo Chi Tiết</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block">Chiều cao:</span>
                  <span className="font-bold text-foreground text-sm">{talent.height_cm || '—'} cm</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Cân nặng:</span>
                  <span className="font-bold text-foreground text-sm">{talent.weight_kg || '—'} kg</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Size giày:</span>
                  <span className="font-bold text-foreground text-sm">{talent.shoe_size || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Số đo 3 vòng:</span>
                  <span className="font-bold text-foreground text-sm">
                    {talent.chest_cm ? `${talent.chest_cm} - ${talent.waist_cm} - ${talent.hip_cm}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Hình xăm / Khuyên:</span>
                  <span className="font-semibold text-foreground">
                    {(talent.tattoos_piercings || ['none']).join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Phương tiện di chuyển:</span>
                  <span className="font-semibold text-foreground">
                    {(talent.transportation || ['motorbike']).join(', ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Kinh nghiệm Diễn xuất */}
            <div className="bg-card rounded-2xl border p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground border-b pb-3">
                <Clapperboard className="w-4 h-4 text-rose-500" />
                <span>Phần 3: Kinh Nghiệm Diễn Xuất Đã Tham Gia</span>
              </div>

              <div className="space-y-4 text-xs">
                {/* Feature & Short Films */}
                <div>
                  <h4 className="font-bold text-foreground mb-2">Phim Điện Ảnh & Phim Ngắn:</h4>
                  {[...(exp.feature_films || []), ...(exp.short_films || [])].length === 0 ? (
                    <p className="text-muted-foreground italic">Chưa có thông tin</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[...(exp.feature_films || []), ...(exp.short_films || [])].map((f, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg border bg-muted/40">
                          <div className="font-bold text-foreground">{f.title}</div>
                          <div className="text-muted-foreground">
                            Vai: <span className="font-medium text-foreground">{f.role}</span> {f.character ? `(${f.character})` : ''} • Năm: {f.year || '2024'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* TV Series & Web Drama */}
                <div>
                  <h4 className="font-bold text-foreground mb-2">Truyền Hình & Web Drama:</h4>
                  {[...(exp.tv_shows || []), ...(exp.web_dramas || [])].length === 0 ? (
                    <p className="text-muted-foreground italic">Chưa có thông tin</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[...(exp.tv_shows || []), ...(exp.web_dramas || [])].map((f, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg border bg-muted/40">
                          <div className="font-bold text-foreground">{f.title}</div>
                          <div className="text-muted-foreground">
                            Vai: <span className="font-medium text-foreground">{f.role}</span> {f.character ? `(${f.character})` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Commercials & Music Videos */}
                <div>
                  <h4 className="font-bold text-foreground mb-2">Quảng Cáo (TVC) & Music Video:</h4>
                  {[...(exp.commercials || []), ...(exp.music_videos || [])].length === 0 ? (
                    <p className="text-muted-foreground italic">Chưa có thông tin</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(exp.commercials || []).map((c, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg border bg-muted/40">
                          <div className="font-bold text-foreground">{c.brand} (TVC)</div>
                          <div className="text-muted-foreground">Vai {c.role} • {c.year}</div>
                        </div>
                      ))}
                      {(exp.music_videos || []).map((m, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg border bg-muted/40">
                          <div className="font-bold text-foreground">{m.song} - {m.artist} (MV)</div>
                          <div className="text-muted-foreground">Vai {m.role} • {m.year}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 4: Kỹ năng đặc thù & Ngôn ngữ */}
            <div className="bg-card rounded-2xl border p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground border-b pb-3">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Phần 4: Kỹ Năng Đặc Thù & Ngôn Ngữ</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground font-semibold block mb-1">Giọng nói Vùng Miền:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(talent.vietnamese_accents || []).map((a, idx) => (
                      <span key={idx} className="px-2 py-1 bg-muted rounded-md font-medium text-foreground">
                        Giọng {a.accent} ({a.level})
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground font-semibold block mb-1">Ngoại Ngữ:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(talent.languages || []).map((l, idx) => (
                      <span key={idx} className="px-2 py-1 bg-muted rounded-md font-medium text-foreground">
                        {l.language} ({l.level})
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground font-semibold block mb-1">Võ Thuật & Hành Động:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(talent.martial_arts || []).length > 0 ? (
                      talent.martial_arts.map((m, idx) => (
                        <span key={idx} className="px-2 py-1 bg-amber-50 text-amber-800 rounded-md font-medium border border-amber-200">
                          {m.style} ({m.level})
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">Chưa có</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground font-semibold block mb-1">Nhạc Cụ:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(talent.instruments || []).length > 0 ? (
                      talent.instruments.map((i, idx) => (
                        <span key={idx} className="px-2 py-1 bg-indigo-50 text-indigo-800 rounded-md font-medium border border-indigo-200">
                          {i.name || i.style} ({i.level})
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">Chưa có</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Định hướng & Mức độ Sẵn sàng */}
            <div className="bg-card rounded-2xl border p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground border-b pb-3">
                <HeartHandshake className="w-4 h-4 text-emerald-500" />
                <span>Phần 5: Định Hướng & Mức Độ Sẵn Sàng Cho Vai Diễn</span>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground font-semibold block mb-1">Khu vực có thể làm việc:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(talent.willing_work_cities || ['TP.HCM']).map(c => (
                      <span key={c} className="px-2 py-1 bg-emerald-50 text-emerald-800 font-medium rounded-md border border-emerald-200">
                        📍 {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground font-semibold block mb-1">Mức độ cởi mở cho cảnh diễn đặc biệt:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(talent.role_willingness || []).map(w => {
                      const mapName: Record<string, string> = {
                        kissing_scene: 'Cảnh hôn',
                        swimsuit: 'Đồ bơi / Bikini',
                        lingerie: 'Nội y',
                        partial_nudity: 'Bán khỏa thân',
                        hair_color: 'Đổi màu tóc',
                        cut_hair: 'Cắt tóc'
                      };
                      return (
                        <span key={w} className="px-2 py-1 bg-rose-50 text-rose-800 font-semibold rounded-md border border-rose-200">
                          ✓ Sẵn sàng {mapName[w] || w}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
