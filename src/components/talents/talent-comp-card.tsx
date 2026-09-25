'use client';

import React from 'react';
import { TalentProfile } from '@/lib/types/crm';
import { calculateAge, formatPhoneNumber } from '@/lib/utils';
import { Printer, Download, Sparkles, MapPin, Phone, Mail, Film, Clapperboard } from 'lucide-react';

interface TalentCompCardProps {
  talent: TalentProfile;
}

export function TalentCompCard({ talent }: TalentCompCardProps) {
  const age = calculateAge(talent.dob);

  const handlePrint = () => {
    window.print();
  };

  const defaultHero = talent.headshot_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800';
  const defaultFull = talent.fullbody_url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800';
  const defaultSide = talent.compcard_url || defaultHero;

  // Flatten experiences
  const exp = talent.acting_experience || {
    feature_films: [],
    short_films: [],
    tv_shows: [],
    web_dramas: [],
    commercials: [],
    music_videos: []
  };

  const allFilms = [
    ...(exp.feature_films || []).map(f => ({ ...f, type: 'Điện ảnh' })),
    ...(exp.short_films || []).map(f => ({ ...f, type: 'Phim ngắn' })),
    ...(exp.tv_shows || []).map(f => ({ ...f, type: 'Truyền hình' })),
    ...(exp.web_dramas || []).map(f => ({ ...f, type: 'Web Drama' })),
    ...(exp.commercials || []).map(c => ({ title: c.brand, role: c.role, year: c.year, type: 'TVC' })),
    ...(exp.music_videos || []).map(m => ({ title: `${m.song} (${m.artist})`, role: m.role, year: m.year, type: 'Music Video' })),
  ];

  return (
    <div className="space-y-4">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border shadow-xs print:hidden">
        <div>
          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Comp-Card (Sed Card) Tiêu Chuẩn Điện Ảnh</span>
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bản hồ sơ nhân sự chuẩn quốc tế sẵn sàng xuất file PDF hoặc in trực tiếp gửi Đạo diễn / Nhà sản xuất
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Printer className="w-4 h-4" />
          <span>In / Xuất PDF Comp-Card</span>
        </button>
      </div>

      {/* Printable Area - Standard A4 Proportion */}
      <div 
        id="comp-card-print-area"
        className="w-full max-w-4xl mx-auto bg-white text-slate-900 rounded-2xl border shadow-xl overflow-hidden p-8 sm:p-10 space-y-8 print:p-0 print:border-none print:shadow-none print:max-w-none"
      >
        {/* Header Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-rose-600 uppercase">
                ACT ACADEMY CASTING DEPT.
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">
                TALENT POOL
              </span>
              {talent.academic_profile?.highest_act_level && (
                <span className="text-[10px] bg-slate-900 text-white font-bold px-2 py-0.5 rounded tracking-wide">
                  🎓 {talent.academic_profile.highest_class_code || talent.academic_profile.highest_act_level}
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mt-1">
              {talent.full_name}
            </h1>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
              Diễn viên Điện ảnh & Truyền hình • Đào tạo ACT Academy ({talent.academic_profile?.highest_class_code || 'Khóa Diễn Xuất'})
            </p>
          </div>

          <div className="text-right text-xs space-y-0.5">
            <div className="font-bold text-slate-800">ACT ACADEMY VIETNAM</div>
            <div className="text-slate-500">Hotline: 090 123 4567</div>
            <div className="text-slate-500">Email: casting@act.edu.vn</div>
          </div>
        </div>

        {/* Hero Gallery Grid (1 Big Portrait, 2 Supporting Photos) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Main Hero Headshot (Takes 2 cols) */}
          <div className="md:col-span-2 aspect-[4/5] rounded-xl overflow-hidden bg-slate-100 border relative">
            <img
              src={defaultHero}
              alt={talent.full_name}
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold uppercase px-2.5 py-1 rounded">
              Góc chân dung (Hero Headshot)
            </div>
          </div>

          {/* 2 Supporting Photos Stacked (Takes 1 col) */}
          <div className="flex flex-col gap-4">
            <div className="aspect-[4/5] rounded-xl overflow-hidden bg-slate-100 border relative flex-1">
              <img
                src={defaultFull}
                alt="Full body shot"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[9px] font-semibold uppercase px-2 py-0.5 rounded">
                Toàn thân (Full Body)
              </div>
            </div>
            <div className="aspect-[4/5] rounded-xl overflow-hidden bg-slate-100 border relative flex-1">
              <img
                src={defaultSide}
                alt="Side angle shot"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[9px] font-semibold uppercase px-2 py-0.5 rounded">
                Góc nghiêng / Biểu cảm
              </div>
            </div>
          </div>
        </div>

        {/* Vital Statistics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 py-4 px-5 bg-slate-50 rounded-xl border border-slate-200 text-center">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Chiều cao</div>
            <div className="text-base font-black text-slate-800 mt-0.5">{talent.height_cm || '—'} cm</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Cân nặng</div>
            <div className="text-base font-black text-slate-800 mt-0.5">{talent.weight_kg || '—'} kg</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Số đo 3 vòng</div>
            <div className="text-base font-black text-slate-800 mt-0.5">
              {talent.chest_cm ? `${talent.chest_cm}-${talent.waist_cm}-${talent.hip_cm}` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Tuổi / Năm sinh</div>
            <div className="text-base font-black text-slate-800 mt-0.5">
              {age !== null ? `${age} tuổi` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Giày (Shoe)</div>
            <div className="text-base font-black text-slate-800 mt-0.5">{talent.shoe_size || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Khu vực</div>
            <div className="text-base font-black text-slate-800 mt-0.5">
              {talent.city || 'TP.HCM'}
            </div>
          </div>
        </div>

        {/* Detailed Stats & Filmography Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
          {/* Left Column: Skills & Accents & Attributes */}
          <div className="space-y-4">
            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 border-b pb-1.5 mb-2">
                Giọng nói & Ngôn ngữ
              </h3>
              <div className="space-y-1 text-slate-600">
                <div>
                  <span className="font-bold text-slate-800">Giọng vùng miền:</span>{' '}
                  {(talent.vietnamese_accents || []).map(a => `Giọng ${a.accent} (${a.level})`).join(', ') || 'Tiếng Việt chuẩn'}
                </div>
                <div>
                  <span className="font-bold text-slate-800">Ngoại ngữ:</span>{' '}
                  {(talent.languages || []).map(l => `${l.language} (${l.level})`).join(', ') || 'Tiếng Việt'}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 border-b pb-1.5 mb-2">
                Kỹ năng đặc thù (Special Skills)
              </h3>
              <div className="space-y-1.5 text-slate-600">
                {talent.martial_arts && talent.martial_arts.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-800">Võ thuật:</span>{' '}
                    {talent.martial_arts.map(m => `${m.style} (${m.level})`).join(', ')}
                  </div>
                )}
                {talent.instruments && talent.instruments.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-800">Nhạc cụ:</span>{' '}
                    {talent.instruments.map(i => `${i.name || i.style} (${i.level})`).join(', ')}
                  </div>
                )}
                {talent.dancing && talent.dancing.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-800">Vũ đạo:</span>{' '}
                    {talent.dancing.map(d => `${d.style} (${d.level})`).join(', ')}
                  </div>
                )}
                {talent.sports && talent.sports.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-800">Thể thao:</span>{' '}
                    {talent.sports.map(s => `${s.name} (${s.level})`).join(', ')}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 border-b pb-1.5 mb-2">
                Mức độ Sẵn sàng cho Vai diễn
              </h3>
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
                    <span key={w} className="px-2 py-0.5 bg-slate-100 text-slate-800 font-semibold rounded text-[10px]">
                      ✓ {mapName[w] || w}
                    </span>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 border-b pb-1.5 mb-2">
                Đào Tạo Diễn Xuất Tại ACT Academy
              </h3>
              <div className="space-y-1.5 text-slate-700 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Cấp độ cao nhất:</span>
                  <span className="font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    🎓 {talent.academic_profile?.highest_class_code || talent.academic_profile?.highest_act_level || 'ACT 1'}
                  </span>
                </div>
                <div className="text-slate-500 text-[10px]">
                  Học trình tích lũy: <strong>{talent.academic_profile?.total_courses_count || 1} Term đào tạo thực chiến</strong>
                </div>
                {talent.academic_profile?.enrollments && talent.academic_profile.enrollments.length > 0 && (
                  <div className="text-slate-600 pt-1 text-[10px] space-y-0.5 border-t border-slate-100">
                    {talent.academic_profile.enrollments.slice(0, 3).map((enr, i) => (
                      <div key={i} className="flex justify-between">
                        <span>• {enr.class_code} ({enr.term_name})</span>
                        <span className="font-semibold text-emerald-700">{enr.status === 'completed' ? 'Tốt nghiệp' : 'Đang học'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Filmography Highlights */}
          <div className="space-y-4">
            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 border-b pb-1.5 mb-2">
                Kinh nghiệm Diễn xuất tiêu biểu
              </h3>
              {allFilms.length === 0 ? (
                <p className="text-slate-400 italic">Đang cập nhật hồ sơ các dự án tham gia.</p>
              ) : (
                <div className="space-y-2.5">
                  {allFilms.slice(0, 5).map((film, idx) => (
                    <div key={idx} className="flex items-start justify-between border-b border-slate-100 pb-1.5">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">
                          {film.title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Vai {film.role === 'leading' ? 'Chính' : film.role === 'supporting' ? 'Phụ' : 'Khách mời'} • {film.type}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {film.year || '2024'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 border-b pb-1.5 mb-2">
                Địa bàn sẵn sàng quay
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(talent.willing_work_cities || ['TP.HCM']).map(c => (
                  <span key={c} className="px-2 py-0.5 bg-rose-50 text-rose-700 font-semibold rounded text-[10px] border border-rose-200">
                    📍 {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Seal */}
        <div className="pt-6 border-t-2 border-slate-900 flex items-center justify-between text-xs text-slate-500">
          <div>
            <div className="font-bold text-slate-900">ACT ACADEMY CASTING MANAGEMENT</div>
            <div>Bản quyền hồ sơ diễn viên thuộc ACT Academy & Nghệ sĩ</div>
          </div>
          <div className="text-right">
            <span className="font-mono text-[10px] bg-slate-100 px-2 py-1 rounded">
              ID: {talent.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
