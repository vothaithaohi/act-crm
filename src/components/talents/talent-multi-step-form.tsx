'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TalentProfile, 
  FilmRole, 
  CommercialRole, 
  MusicVideoRole,
  GenderType 
} from '@/lib/types/crm';
import { useCRM } from '@/lib/store/crm-context';
import { calculateAge } from '@/lib/utils';
import { 
  User, 
  Ruler, 
  Clapperboard, 
  Sparkles, 
  HeartHandshake, 
  Camera, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  Plus, 
  Trash2, 
  Check, 
  ArrowLeft 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TalentMultiStepFormProps {
  initialData?: TalentProfile;
  isEdit?: boolean;
}

const STEPS = [
  { id: 1, title: 'Thông tin cá nhân', icon: User, desc: 'Họ tên, ngày sinh, liên hệ' },
  { id: 2, title: 'Nhân trắc học & Số đo', icon: Ruler, desc: 'Chiều cao, cân nặng, 3 vòng' },
  { id: 3, title: 'Kinh nghiệm diễn xuất', icon: Clapperboard, desc: 'Phim điện ảnh, truyền hình, TVC' },
  { id: 4, title: 'Kỹ năng & Ngôn ngữ', icon: Sparkles, desc: 'Giọng nói, ngoại ngữ, võ thuật' },
  { id: 5, title: 'Mức độ sẵn sàng vai', icon: HeartHandshake, desc: 'Cảnh hôn, bikini, địa bàn quay' },
  { id: 6, title: 'Hình ảnh & Mạng xã hội', icon: Camera, desc: 'Headshot, toàn thân, showreel' },
];

export function TalentMultiStepForm({ initialData, isEdit }: TalentMultiStepFormProps) {
  const router = useRouter();
  const { saveTalent } = useCRM();

  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState<TalentProfile>(() => {
    if (initialData) return initialData;

    return {
      id: crypto.randomUUID(),
      user_id: null,
      lead_id: null,
      full_name: '',
      email: '',
      phone: '',
      home_phone: '',
      gender: 'male',
      parent_guardian_name: null,
      address: '',
      city: 'TP.HCM',
      province: 'TP.HCM',
      dob: '2000-01-01',
      height_cm: 170,
      weight_kg: 60,
      shoe_size: '40',
      chest_cm: 88,
      waist_cm: 72,
      hip_cm: 90,
      acting_experience: {
        feature_films: [],
        short_films: [],
        tv_shows: [],
        web_dramas: [],
        commercials: [],
        music_videos: []
      },
      willing_work_cities: ['TP.HCM'],
      preferred_project_types: ['feature_film', 'web_drama'],
      preferred_role_types: ['leading', 'supporting'],
      acting_genres: ['drama', 'comedy'],
      role_willingness: ['kissing_scene'],
      social_links: {
        facebook: '',
        instagram: '',
        tiktok: '',
        showreel_url: ''
      },
      languages: [
        { language: 'Tiếng Việt', level: 'Bản ngữ' },
        { language: 'Tiếng Anh', level: 'Giao tiếp' }
      ],
      vietnamese_accents: [
        { accent: 'Nam', level: 'Bản ngữ' }
      ],
      instruments: [],
      sports: [{ name: 'Gym / Fitness', level: 'Cơ bản' }],
      dancing: [],
      singing: { genres: ['Pop'], vocal_range: ['Tenor'], level: 'Cơ bản' },
      martial_arts: [],
      transportation: ['motorbike'],
      tattoos_piercings: ['none'],
      headshot_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
      fullbody_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800',
      compcard_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'
    };
  });

  const age = calculateAge(formData.dob);

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.full_name.trim() || !formData.phone.trim()) {
        alert('Vui lòng nhập Họ tên và Số điện thoại!');
        return;
      }
    }
    setCurrentStep(s => Math.min(s + 1, 6));
  };

  const handlePrev = () => {
    setCurrentStep(s => Math.max(s - 1, 1));
  };

  const handleSave = () => {
    if (!formData.full_name.trim() || !formData.phone.trim()) {
      alert('Vui lòng nhập đầy đủ Họ tên và Số điện thoại!');
      setCurrentStep(1);
      return;
    }

    saveTalent(formData);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    router.push(`/talents/${formData.id}`);
  };

  // Helper to add a film role
  const addFilmRole = (type: 'feature_films' | 'short_films' | 'tv_shows' | 'web_dramas') => {
    setFormData(prev => ({
      ...prev,
      acting_experience: {
        ...prev.acting_experience,
        [type]: [
          ...(prev.acting_experience[type] || []),
          { title: '', role: 'supporting', character: '', year: 2024 }
        ]
      }
    }));
  };

  const removeFilmRole = (type: 'feature_films' | 'short_films' | 'tv_shows' | 'web_dramas', index: number) => {
    setFormData(prev => ({
      ...prev,
      acting_experience: {
        ...prev.acting_experience,
        [type]: prev.acting_experience[type].filter((_, i) => i !== index)
      }
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        <div className="text-right">
          <span className="text-xs font-semibold text-brand-600">
            Bước {currentStep} / 6
          </span>
          <h2 className="text-lg font-bold text-foreground">
            {STEPS[currentStep - 1].title}
          </h2>
        </div>
      </div>

      {/* Stepper Progress Indicator */}
      <div className="bg-card rounded-2xl border p-4 shadow-xs">
        <div className="grid grid-cols-6 gap-2">
          {STEPS.map((s) => {
            const isDone = s.id < currentStep;
            const isCurrent = s.id === currentStep;
            const Icon = s.icon;

            return (
              <button
                key={s.id}
                onClick={() => setCurrentStep(s.id)}
                className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${
                  isCurrent 
                    ? 'bg-brand-500 text-white shadow-xs' 
                    : isDone
                    ? 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                  isCurrent ? 'bg-white text-brand-600' : isDone ? 'bg-brand-600 text-white' : 'bg-muted'
                }`}>
                  {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.id}
                </div>
                <span className="text-[11px] font-semibold hidden md:block line-clamp-1">{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Step Form Body */}
      <div className="bg-card rounded-2xl border p-6 md:p-8 shadow-xs text-sm">
        {/* STEP 1: Personal Info */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <h3 className="font-bold text-base border-b pb-3 text-foreground">
              Bước 1: Thông Tin Cá Nhân & Liên Hệ (Personal Information)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Họ và tên nghệ danh / Khai sinh <span className="text-brand-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Trương Ngọc Ánh"
                  value={formData.full_name}
                  onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Giới tính <span className="text-brand-500">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData(p => ({ ...p, gender: e.target.value as GenderType }))}
                  className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none font-medium"
                >
                  <option value="male">Nam (Male)</option>
                  <option value="female">Nữ (Female)</option>
                  <option value="other">Khác (Other)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Ngày tháng năm sinh (DOB)
                </label>
                <input
                  type="date"
                  value={formData.dob || ''}
                  onChange={(e) => setFormData(p => ({ ...p, dob: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none"
                />
                {age !== null && (
                  <span className="text-xs text-brand-600 font-semibold mt-1 block">
                    Độ tuổi tính toán: {age} tuổi
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Số điện thoại di động <span className="text-brand-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="0912 345 678"
                  value={formData.phone}
                  onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Email liên hệ
                </label>
                <input
                  type="email"
                  placeholder="dienvien@act.edu.vn"
                  value={formData.email}
                  onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Địa chỉ thường trú / Tạm trú
                </label>
                <input
                  type="text"
                  placeholder="Số nhà, Tên đường, Phường/Xã..."
                  value={formData.address || ''}
                  onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Tỉnh / Thành phố hiện tại
                </label>
                <input
                  type="text"
                  placeholder="TP.HCM, Hà Nội..."
                  value={formData.city || 'TP.HCM'}
                  onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none"
                />
              </div>
            </div>

            {age !== null && age < 18 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <label className="block text-xs font-bold text-amber-800 uppercase mb-1">
                  Họ tên & Số điện thoại Phụ huynh / Người giám hộ (Diễn viên dưới 18 tuổi)
                </label>
                <input
                  type="text"
                  placeholder="Họ tên phụ huynh - SĐT liên lạc"
                  value={formData.parent_guardian_name || ''}
                  onChange={(e) => setFormData(p => ({ ...p, parent_guardian_name: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg border bg-background focus:border-amber-500 outline-none text-xs"
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Anthropometrics & Measurements */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <h3 className="font-bold text-base border-b pb-3 text-foreground">
              Bước 2: Nhân Trắc Học & Số Đo Cơ Thể (Body Measurements)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Chiều cao (cm)
                </label>
                <input
                  type="number"
                  placeholder="172"
                  value={formData.height_cm || ''}
                  onChange={(e) => setFormData(p => ({ ...p, height_cm: Number(e.target.value) }))}
                  className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Cân nặng (kg)
                </label>
                <input
                  type="number"
                  placeholder="65"
                  value={formData.weight_kg || ''}
                  onChange={(e) => setFormData(p => ({ ...p, weight_kg: Number(e.target.value) }))}
                  className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Size giày (Shoe size)
                </label>
                <input
                  type="text"
                  placeholder="40"
                  value={formData.shoe_size || ''}
                  onChange={(e) => setFormData(p => ({ ...p, shoe_size: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Vòng 1 - Ngực (cm)
                </label>
                <input
                  type="number"
                  placeholder="88"
                  value={formData.chest_cm || ''}
                  onChange={(e) => setFormData(p => ({ ...p, chest_cm: Number(e.target.value) }))}
                  className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Vòng 2 - Eo (cm)
                </label>
                <input
                  type="number"
                  placeholder="68"
                  value={formData.waist_cm || ''}
                  onChange={(e) => setFormData(p => ({ ...p, waist_cm: Number(e.target.value) }))}
                  className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Vòng 3 - Hông (cm)
                </label>
                <input
                  type="number"
                  placeholder="92"
                  value={formData.hip_cm || ''}
                  onChange={(e) => setFormData(p => ({ ...p, hip_cm: Number(e.target.value) }))}
                  className="w-full px-3.5 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                Vị trí hình xăm & Xỏ khuyên (Tattoos & Piercings)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'none', label: 'Không có hình xăm' },
                  { id: 'arms_shoulder', label: 'Cánh tay / Vai' },
                  { id: 'legs_feet', label: 'Chân / Cổ chân' },
                  { id: 'stomach', label: 'Bụng / Lưng' },
                  { id: 'unseen', label: 'Vị trí kín (không lộ)' },
                  { id: 'face_neck', label: 'Cổ / Mặt' },
                ].map(item => {
                  const active = (formData.tattoos_piercings || []).includes(item.id);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        const current = formData.tattoos_piercings || [];
                        const exists = current.includes(item.id);
                        setFormData(p => ({
                          ...p,
                          tattoos_piercings: exists ? current.filter(x => x !== item.id) : [...current, item.id]
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        active ? 'bg-slate-900 text-white border-slate-900' : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Acting Experience */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="font-bold text-base border-b pb-3 text-foreground">
              Bước 3: Lịch Sử Tham Gia Phim & Dự Án (Acting Experience)
            </h3>

            {/* Feature Films */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                  Phim Điện Ảnh (Feature Films)
                </span>
                <button
                  type="button"
                  onClick={() => addFilmRole('feature_films')}
                  className="flex items-center gap-1 text-xs text-brand-600 font-semibold hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm phim
                </button>
              </div>

              {(formData.acting_experience.feature_films || []).map((film, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Tên phim (VD: Mai, Lật Mặt...)"
                    value={film.title}
                    onChange={(e) => {
                      const updated = [...formData.acting_experience.feature_films];
                      updated[idx].title = e.target.value;
                      setFormData(p => ({ ...p, acting_experience: { ...p.acting_experience, feature_films: updated } }));
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-brand-500"
                  />
                  <select
                    value={film.role}
                    onChange={(e) => {
                      const updated = [...formData.acting_experience.feature_films];
                      updated[idx].role = e.target.value as any;
                      setFormData(p => ({ ...p, acting_experience: { ...p.acting_experience, feature_films: updated } }));
                    }}
                    className="px-2 py-1.5 rounded-lg border bg-background text-xs outline-none"
                  >
                    <option value="leading">Vai chính</option>
                    <option value="supporting">Vai phụ</option>
                    <option value="cameo">Cameo</option>
                    <option value="extra">Quần chúng</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Năm"
                    value={film.year || ''}
                    onChange={(e) => {
                      const updated = [...formData.acting_experience.feature_films];
                      updated[idx].year = Number(e.target.value);
                      setFormData(p => ({ ...p, acting_experience: { ...p.acting_experience, feature_films: updated } }));
                    }}
                    className="w-20 px-2 py-1.5 rounded-lg border bg-background text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeFilmRole('feature_films', idx)}
                    className="p-1.5 text-muted-foreground hover:text-rose-500 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Web Drama & Short Films */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                  Web Drama & Phim Ngắn (Short Films)
                </span>
                <button
                  type="button"
                  onClick={() => addFilmRole('web_dramas')}
                  className="flex items-center gap-1 text-xs text-brand-600 font-semibold hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm dự án
                </button>
              </div>

              {(formData.acting_experience.web_dramas || []).map((film, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Tên Web drama / Phim ngắn"
                    value={film.title}
                    onChange={(e) => {
                      const updated = [...formData.acting_experience.web_dramas];
                      updated[idx].title = e.target.value;
                      setFormData(p => ({ ...p, acting_experience: { ...p.acting_experience, web_dramas: updated } }));
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-brand-500"
                  />
                  <select
                    value={film.role}
                    onChange={(e) => {
                      const updated = [...formData.acting_experience.web_dramas];
                      updated[idx].role = e.target.value as any;
                      setFormData(p => ({ ...p, acting_experience: { ...p.acting_experience, web_dramas: updated } }));
                    }}
                    className="px-2 py-1.5 rounded-lg border bg-background text-xs outline-none"
                  >
                    <option value="leading">Vai chính</option>
                    <option value="supporting">Vai phụ</option>
                    <option value="cameo">Cameo</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeFilmRole('web_dramas', idx)}
                    className="p-1.5 text-muted-foreground hover:text-rose-500 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Skills & Languages */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="font-bold text-base border-b pb-3 text-foreground">
              Bước 4: Kỹ Năng Đặc Thù & Ngôn Ngữ (Special Skills)
            </h3>

            {/* Accents */}
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">
                Giọng nói Vùng Miền (Accents)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Nam', 'Bắc', 'Trung', 'Huế'].map(acc => {
                  const active = (formData.vietnamese_accents || []).some(a => a.accent === acc);
                  return (
                    <button
                      type="button"
                      key={acc}
                      onClick={() => {
                        const current = formData.vietnamese_accents || [];
                        const exists = current.some(a => a.accent === acc);
                        setFormData(p => ({
                          ...p,
                          vietnamese_accents: exists ? current.filter(a => a.accent !== acc) : [...current, { accent: acc, level: 'Bản ngữ' }]
                        }));
                      }}
                      className={`p-2 rounded-lg border text-xs font-semibold transition-all ${
                        active ? 'bg-brand-500 text-white border-brand-500' : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Giọng {acc}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Martial Arts */}
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">
                Võ thuật & Cascadeur
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Boxing', 'Vovinam', 'Taekwondo', 'Karate', 'Muay Thai', 'Võ Cổ Truyền'].map(art => {
                  const active = (formData.martial_arts || []).some(m => m.style === art);
                  return (
                    <button
                      type="button"
                      key={art}
                      onClick={() => {
                        const current = formData.martial_arts || [];
                        const exists = current.some(m => m.style === art);
                        setFormData(p => ({
                          ...p,
                          martial_arts: exists ? current.filter(m => m.style !== art) : [...current, { style: art, level: 'Cơ bản' }]
                        }));
                      }}
                      className={`p-2 rounded-lg border text-xs font-semibold transition-all ${
                        active ? 'bg-amber-500 text-white border-amber-500' : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {art}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Musical Instruments */}
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">
                Nhạc cụ biểu diễn
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Guitar', 'Piano', 'Trống', 'Ukulele', 'Violin'].map(inst => {
                  const active = (formData.instruments || []).some(i => i.name === inst || i.style === inst);
                  return (
                    <button
                      type="button"
                      key={inst}
                      onClick={() => {
                        const current = formData.instruments || [];
                        const exists = current.some(i => i.name === inst);
                        setFormData(p => ({
                          ...p,
                          instruments: exists ? current.filter(i => i.name !== inst) : [...current, { name: inst, level: 'Cơ bản' }]
                        }));
                      }}
                      className={`p-2 rounded-lg border text-xs font-semibold transition-all ${
                        active ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {inst}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Willingness & Preferences */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h3 className="font-bold text-base border-b pb-3 text-foreground">
              Bước 5: Định Hướng & Mức Độ Sẵn Sàng Vai Diễn (Role Willingness)
            </h3>

            {/* Willing cities */}
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">
                Sẵn sàng quay tại tỉnh thành nào?
              </label>
              <div className="flex flex-wrap gap-2">
                {['TP.HCM', 'Hà Nội', 'Đà Nẵng', 'Miền Tây', 'Hạ Long', 'Nước ngoài'].map(city => {
                  const active = (formData.willing_work_cities || []).includes(city);
                  return (
                    <button
                      type="button"
                      key={city}
                      onClick={() => {
                        const current = formData.willing_work_cities || [];
                        const exists = current.includes(city);
                        setFormData(p => ({
                          ...p,
                          willing_work_cities: exists ? current.filter(c => c !== city) : [...current, city]
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      📍 {city}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Role Willingness Checkboxes */}
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">
                Mức độ cởi mở cho các phân cảnh đặc biệt:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'kissing_scene', label: 'Sẵn sàng đóng cảnh hôn (Kissing scene)' },
                  { id: 'swimsuit', label: 'Sẵn sàng mặc đồ bơi / Bikini' },
                  { id: 'lingerie', label: 'Sẵn sàng mặc trang phục nội y' },
                  { id: 'partial_nudity', label: 'Sẵn sàng cảnh bán khỏa thân nghệ thuật' },
                  { id: 'hair_color', label: 'Sẵn sàng thay đổi màu tóc theo tạo hình vai diễn' },
                  { id: 'cut_hair', label: 'Sẵn sàng cắt tóc ngắn theo tạo hình vai diễn' },
                ].map(item => {
                  const active = (formData.role_willingness || []).includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        const current = formData.role_willingness || [];
                        const exists = current.includes(item.id);
                        setFormData(p => ({
                          ...p,
                          role_willingness: exists ? current.filter(x => x !== item.id) : [...current, item.id]
                        }));
                      }}
                      className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                        active ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold' : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        active ? 'bg-rose-600 border-rose-600 text-white' : 'border-border'
                      }`}>
                        {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-xs">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Media & Socials */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <h3 className="font-bold text-base border-b pb-3 text-foreground">
              Bước 6: Hình Ảnh Comp-Card & Mạng Xã Hội (Media & Socials)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  URL Ảnh Headshot (Chân dung góc thẳng)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.headshot_url || ''}
                  onChange={(e) => setFormData(p => ({ ...p, headshot_url: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-brand-500"
                />
                {formData.headshot_url && (
                  <div className="mt-2 aspect-[3/4] rounded-lg overflow-hidden bg-muted border">
                    <img src={formData.headshot_url} alt="Headshot" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  URL Ảnh Toàn Thân (Full body)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.fullbody_url || ''}
                  onChange={(e) => setFormData(p => ({ ...p, fullbody_url: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-brand-500"
                />
                {formData.fullbody_url && (
                  <div className="mt-2 aspect-[3/4] rounded-lg overflow-hidden bg-muted border">
                    <img src={formData.fullbody_url} alt="Fullbody" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  URL Ảnh Comp-Card / Góc nghiêng
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.compcard_url || ''}
                  onChange={(e) => setFormData(p => ({ ...p, compcard_url: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-brand-500"
                />
                {formData.compcard_url && (
                  <div className="mt-2 aspect-[3/4] rounded-lg overflow-hidden bg-muted border">
                    <img src={formData.compcard_url} alt="Compcard" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-3 pt-3 border-t">
              <span className="font-bold text-xs uppercase tracking-wider text-foreground block">
                Liên Kết Mạng Xã Hội & Showreel
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Facebook URL</label>
                  <input
                    type="url"
                    placeholder="https://facebook.com/..."
                    value={formData.social_links?.facebook || ''}
                    onChange={(e) => setFormData(p => ({ ...p, social_links: { ...p.social_links, facebook: e.target.value } }))}
                    className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Instagram URL</label>
                  <input
                    type="url"
                    placeholder="https://instagram.com/..."
                    value={formData.social_links?.instagram || ''}
                    onChange={(e) => setFormData(p => ({ ...p, social_links: { ...p.social_links, instagram: e.target.value } }))}
                    className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">TikTok URL</label>
                  <input
                    type="url"
                    placeholder="https://tiktok.com/@..."
                    value={formData.social_links?.tiktok || ''}
                    onChange={(e) => setFormData(p => ({ ...p, social_links: { ...p.social_links, tiktok: e.target.value } }))}
                    className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">YouTube Showreel URL</label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={formData.social_links?.showreel_url || ''}
                    onChange={(e) => setFormData(p => ({ ...p, social_links: { ...p.social_links, showreel_url: e.target.value } }))}
                    className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none font-semibold text-amber-600"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stepper Navigation Buttons */}
        <div className="pt-6 mt-6 border-t flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={handlePrev}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border hover:bg-muted text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>

          <div className="flex items-center gap-3">
            {currentStep < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-all hover:scale-[1.02]"
              >
                <span>Tiếp theo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-brand-600 to-rose-600 hover:from-brand-700 hover:to-rose-700 text-white rounded-lg text-xs font-bold shadow-md shadow-brand-500/20 transition-all hover:scale-[1.02]"
              >
                <Save className="w-4 h-4" />
                <span>Hoàn Tất & Lưu Hồ Sơ</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
