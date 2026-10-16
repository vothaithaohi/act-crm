'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  CheckSquare,
  ExternalLink,
  Eye,
  Inbox,
  RefreshCw,
  RotateCcw,
  Search,
  Square,
  X,
  Globe,
  GraduationCap,
  Clock
} from 'lucide-react';
import { useCRM } from '@/lib/store/crm-context';
import { REVIEW_STATUS_DETAILS, TalentProfile, TalentReviewStatus, getReviewStatus } from '@/lib/types/crm';
import { calculateAge, formatPhoneNumber } from '@/lib/utils';
import { ACT_ACADEMY_SCHOOL, ART_SCHOOLS } from '@/lib/dienvienvn/schools';
import { talentPath } from '@/lib/talent-path';

type Tab = 'pending' | 'approved' | 'rejected' | 'all';
type SortKey = 'newest' | 'oldest' | 'name';

const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Chờ duyệt' },
  { id: 'approved', label: 'Đã duyệt' },
  { id: 'rejected', label: 'Từ chối' },
  { id: 'all', label: 'Tất cả' }
];

function submittedTime(t: TalentProfile): number {
  return Date.parse(t.submitted_at || t.created_at || '') || 0;
}

function formatDateTime(t: TalentProfile): string {
  const ms = submittedTime(t);
  if (!ms) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(ms));
}

export function trainingSummary(t: TalentProfile): string[] {
  const out: string[] = [];
  const ap = t.academic_profile;
  if (ap?.enrollments?.length) out.push(`ACT Academy${ap.highest_class_code ? ` (${ap.highest_class_code})` : ''}`);
  (ap?.external_trainings || []).forEach(e => out.push(e.school_name));
  return out;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

export function SubmissionsReview() {
  const { talents, reviewTalent, refreshTalents, can, isSupabaseConnected } = useCRM();
  const [tab, setTab] = useState<Tab>('pending');
  const [query, setQuery] = useState('');
  const [gender, setGender] = useState<'all' | 'male' | 'female' | 'other'>('all');
  const [school, setSchool] = useState('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [selected, setSelected] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const canReview = can('talents:write');

  const submissions = useMemo(() => talents.filter(t => t.submission_source === 'dienvienvn'), [talents]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: submissions.length, today: 0 };
    const todayVN = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    submissions.forEach(t => {
      c[getReviewStatus(t)]++;
      const ms = submittedTime(t);
      if (ms && new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(ms)) === todayVN) c.today++;
    });
    return c;
  }, [submissions]);

  const list = useMemo(() => {
    const q = normalize(query.trim());
    const qDigits = query.replace(/\D/g, '');
    const filtered = submissions.filter(t => {
      if (tab !== 'all' && getReviewStatus(t) !== tab) return false;
      if (gender !== 'all' && t.gender !== gender) return false;
      if (school !== 'all') {
        const schools = trainingSummary(t).map(s => (s.startsWith(ACT_ACADEMY_SCHOOL) ? ACT_ACADEMY_SCHOOL : s));
        if (school === 'none' ? schools.length > 0 : !schools.includes(school)) return false;
      }
      if (q) {
        const hay = normalize(`${t.full_name} ${t.email || ''} ${t.city || ''} ${trainingSummary(t).join(' ')}`);
        const phoneHit = qDigits.length >= 3 && (t.phone || '').includes(qDigits);
        if (!hay.includes(q) && !phoneHit) return false;
      }
      return true;
    });
    return filtered.sort((a, b) =>
      sort === 'name' ? a.full_name.localeCompare(b.full_name, 'vi') : sort === 'oldest' ? submittedTime(a) - submittedTime(b) : submittedTime(b) - submittedTime(a)
    );
  }, [submissions, tab, gender, school, query, sort]);

  const allSelected = list.length > 0 && list.every(t => selected.includes(t.id));
  const toggle = (id: string) => setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  const toggleAll = () => setSelected(allSelected ? [] : list.map(t => t.id));

  const bulk = async (status: TalentReviewStatus) => {
    const ids = selected.filter(id => list.some(t => t.id === id));
    for (const id of ids) await reviewTalent(id, status);
    setSelected([]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshTalents();
    setRefreshing(false);
  };

  const hasFilters = query || gender !== 'all' || school !== 'all';

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-brand-600" />
            <span>Hồ Sơ Nộp Từ DienVienVN</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Diễn viên tự nộp hồ sơ casting tại dienvienvn.com. Duyệt để đưa vào kho Casting Matching gửi nhà sản xuất.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border bg-card hover:bg-muted text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <a
            href="/dienvienvn/nop-ho-so"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Mở form nộp hồ sơ</span>
          </a>
        </div>
      </div>

      {!isSupabaseConnected && (
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200">
          Đang chạy chế độ dữ liệu cục bộ (chưa kết nối Supabase): chỉ thấy hồ sơ nộp trên chính trình duyệt này. Cấu hình
          <code className="mx-1 font-mono">NEXT_PUBLIC_SUPABASE_URL</code> và chạy migration
          <code className="mx-1 font-mono">20261012_dienvienvn_submissions.sql</code> để nhận hồ sơ từ mọi thiết bị.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Chờ duyệt', value: counts.pending, tone: 'text-amber-600', onClick: () => setTab('pending') },
          { label: 'Đã duyệt', value: counts.approved, tone: 'text-emerald-600', onClick: () => setTab('approved') },
          { label: 'Nộp hôm nay', value: counts.today, tone: 'text-brand-600', onClick: () => setTab('all') },
          { label: 'Tổng hồ sơ', value: counts.all, tone: 'text-foreground', onClick: () => setTab('all') }
        ].map(s => (
          <button key={s.label} onClick={s.onClick} className="bg-card border rounded-2xl p-4 text-left hover:border-brand-500/40 transition-colors">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className={`text-2xl font-bold mt-1 ${s.tone}`}>{s.value}</div>
          </button>
        ))}
      </div>

      {/* Tabs + Filters */}
      <div className="bg-card border rounded-2xl p-3.5 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setSelected([]);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                tab === t.id ? 'bg-brand-500 text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-muted'}`}>{counts[t.id]}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_150px_260px_150px] gap-2 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Tìm theo tên, số điện thoại, email, thành phố…"
              className="w-full pl-8 pr-3 py-2 rounded-lg border bg-background focus:border-brand-500 outline-none"
            />
          </div>
          <select value={gender} onChange={e => setGender(e.target.value as typeof gender)} className="px-3 py-2 rounded-lg border bg-background outline-none">
            <option value="all">Mọi giới tính</option>
            <option value="female">Nữ</option>
            <option value="male">Nam</option>
            <option value="other">Khác</option>
          </select>
          <select value={school} onChange={e => setSchool(e.target.value)} className="px-3 py-2 rounded-lg border bg-background outline-none">
            <option value="all">Mọi nơi đào tạo</option>
            <option value="none">Chưa qua đào tạo</option>
            <option value={ACT_ACADEMY_SCHOOL}>ACT Academy</option>
            {ART_SCHOOLS.map(s => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)} className="px-3 py-2 rounded-lg border bg-background outline-none">
            <option value="newest">Mới nộp nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="name">Tên A → Z</option>
          </select>
        </div>

        {(canReview && list.length > 0) || hasFilters ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex items-center gap-3">
              {canReview && list.length > 0 && (
                <button onClick={toggleAll} className="flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground">
                  {allSelected ? <CheckSquare className="w-4 h-4 text-brand-600" /> : <Square className="w-4 h-4" />}
                  <span>{allSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${list.length})`}</span>
                </button>
              )}
              <span className="text-muted-foreground">Đang hiển thị {list.length} hồ sơ</span>
              {hasFilters && (
                <button
                  onClick={() => {
                    setQuery('');
                    setGender('all');
                    setSchool('all');
                  }}
                  className="flex items-center gap-1 font-semibold text-rose-600 hover:underline"
                >
                  <RotateCcw className="w-3 h-3" /> Xóa lọc
                </button>
              )}
            </div>
            {canReview && selected.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-brand-600">Đã chọn {selected.length}</span>
                <button onClick={() => bulk('approved')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  <Check className="w-3.5 h-3.5" /> Duyệt
                </button>
                <button onClick={() => bulk('rejected')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border hover:bg-muted font-semibold">
                  <X className="w-3.5 h-3.5" /> Từ chối
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="p-16 bg-card rounded-2xl border text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base">
            {submissions.length === 0 ? 'Chưa có hồ sơ nào được nộp' : 'Không có hồ sơ phù hợp'}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {submissions.length === 0
              ? 'Hồ sơ diễn viên nộp tại dienvienvn.com/nop-ho-so sẽ xuất hiện tại đây ngay khi được gửi.'
              : 'Thử đổi tab trạng thái hoặc xóa bớt bộ lọc.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {list.map(t => {
            const status = getReviewStatus(t);
            const age = calculateAge(t.dob);
            const schools = trainingSummary(t);
            const isSel = selected.includes(t.id);
            return (
              <div
                key={t.id}
                className={`bg-card border rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center gap-3.5 transition-colors ${
                  isSel ? 'ring-2 ring-brand-500 border-brand-500' : 'hover:border-brand-500/40'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {canReview && (
                    <button onClick={() => toggle(t.id)} className="shrink-0" title={isSel ? 'Bỏ chọn' : 'Chọn'}>
                      {isSel ? <CheckSquare className="w-4 h-4 text-brand-600" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  )}
                  <Link href={talentPath(t)} className="w-14 h-[72px] rounded-xl overflow-hidden bg-muted shrink-0 border">
                    {t.headshot_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.headshot_url} alt={t.full_name} className="w-full h-full object-cover object-top" loading="lazy" />
                    ) : null}
                  </Link>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={talentPath(t)} className="font-bold text-sm text-foreground hover:text-brand-600 truncate">
                        {t.full_name}
                      </Link>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${REVIEW_STATUS_DETAILS[status].badgeClass}`}>
                        {REVIEW_STATUS_DETAILS[status].label}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2.5 gap-y-0.5">
                      <span>{t.gender === 'female' ? 'Nữ' : t.gender === 'male' ? 'Nam' : 'Khác'}</span>
                      {age !== null && <span>{age} tuổi</span>}
                      {t.height_cm ? <span>{t.height_cm} cm</span> : null}
                      {t.weight_kg ? <span>{t.weight_kg} kg</span> : null}
                      {t.city && <span>{t.city}</span>}
                    </div>
                    <div className="text-[11px] text-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="font-semibold">{formatPhoneNumber(t.phone)}</span>
                      {t.email && <span className="text-muted-foreground truncate">{t.email}</span>}
                    </div>
                  </div>
                </div>

                <div className="md:w-56 text-[11px] space-y-1 shrink-0">
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <GraduationCap className="w-3.5 h-3.5 mt-px shrink-0 text-brand-600" />
                    <span className="line-clamp-2">{schools.length ? schools.join(' • ') : 'Chưa khai báo đào tạo'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{formatDateTime(t)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={talentPath(t)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border hover:bg-muted text-xs font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" /> Xem
                  </Link>
                  {canReview && status !== 'approved' && (
                    <button
                      onClick={() => reviewTalent(t.id, 'approved')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      <Check className="w-3.5 h-3.5" /> Duyệt
                    </button>
                  )}
                  {canReview && status !== 'rejected' && (
                    <button
                      onClick={() => reviewTalent(t.id, 'rejected')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border hover:bg-muted text-xs font-semibold text-muted-foreground"
                    >
                      <X className="w-3.5 h-3.5" /> Từ chối
                    </button>
                  )}
                  {canReview && status !== 'pending' && (
                    <button
                      onClick={() => reviewTalent(t.id, 'pending')}
                      className="p-2 rounded-lg border hover:bg-muted text-muted-foreground"
                      title="Chuyển về Chờ duyệt"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
