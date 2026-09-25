'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  TalentProfile, 
  FilmRole, 
  CommercialRole, 
  MusicVideoRole 
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
  HeartHandshake
} from 'lucide-react';

interface TalentDetailViewProps {
  talent: TalentProfile;
}

export function TalentDetailView({ talent }: TalentDetailViewProps) {
  const { deleteTalent } = useCRM();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'compcard'>('profile');

  const age = calculateAge(talent.dob);

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
            <div className="flex items-center gap-2">
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
              onClick={() => setActiveTab('compcard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'compcard' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Xuất Comp-Card</span>
            </button>
          </div>

          <Link
            href={`/talents/${talent.id}/edit`}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Sửa Hồ Sơ</span>
          </Link>

          <button
            onClick={handleDelete}
            className="p-2 hover:bg-rose-50 text-muted-foreground hover:text-rose-600 rounded-lg border transition-colors"
            title="Xóa hồ sơ"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeTab === 'compcard' ? (
        <TalentCompCard talent={talent} />
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
