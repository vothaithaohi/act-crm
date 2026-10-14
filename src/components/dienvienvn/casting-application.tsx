'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, ChevronLeft, ChevronRight, Clapperboard, Loader2, Mail, Send, UserRound, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProjectRole, PublicProject, isAcceptingApplications } from '@/lib/projects/types';
import { checkLocalApplication, fetchPublicProject, saveLocalApplication } from '@/lib/projects/public-client';
import { actorFetch, signOutActor, useActorSession } from '@/lib/dienvienvn/actor-auth';
import confetti from 'canvas-confetti';
import {
  CASTING_STEPS,
  CastingDraft,
  StepErrors,
  ageFromDob,
  computeCompletion,
  createEmptyDraft,
  validateStep
} from '@/lib/dienvienvn/casting-form';
import { useDvvnHref } from './base-path';
import { GlobalNav } from './site-chrome';
import {
  StepBody,
  StepExperience,
  StepMedia,
  StepPersonal,
  StepProps,
  StepSkills,
  StepTraining,
  StepWillingness
} from './casting-steps';

const DRAFT_KEY = 'dvvn_casting_draft_v1';
/** Tên mẫu trong ô Họ và tên, luân phiên mỗi lần mở form. */
const NAME_HINTS = ['Võ Thái Thảo', 'Nguyễn Đăng Khoa'];
const NAME_HINT_KEY = 'dvvn_name_hint_turn';
/** Kho tạm cho chế độ demo chưa nối Supabase — CRM đọc key này để hiển thị hồ sơ mới nộp. */
export const LOCAL_SUBMISSIONS_KEY = 'dvvn_local_submissions';

const STEP_COMPONENTS: Record<number, React.ComponentType<StepProps>> = {
  1: StepPersonal,
  2: StepBody,
  3: StepExperience,
  4: StepSkills,
  5: StepWillingness,
  6: StepMedia,
  7: StepTraining
};

const STEP_INTROS: Record<number, string> = {
  1: 'Thông tin để đội ngũ casting liên hệ với bạn.',
  2: 'Số đo giúp ghép vai và chuẩn bị trang phục chính xác.',
  3: 'Các dự án bạn đã tham gia. Có thể bỏ qua nếu chưa có.',
  4: 'Chọn tất cả kỹ năng bạn có thể thể hiện trước ống kính.',
  5: 'Nơi bạn có thể đi quay và những phân cảnh bạn sẵn sàng.',
  6: 'Ảnh thật, rõ nét là điều đạo diễn xem đầu tiên.',
  7: 'Quá trình học diễn xuất tại ACT Academy hoặc trường khác.'
};

type StepState = 'current' | 'done' | 'error' | 'upcoming';

interface ApplyTarget {
  project: PublicProject;
  role: ProjectRole;
}

interface SubmitResult {
  appliedTo?: string | null;
  id: string;
  name: string;
  email: string;
  /** Đã gửi email xác nhận & tạo mật khẩu. */
  emailSent: boolean;
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** mode="edit": diễn viên đã đăng nhập chỉnh sửa / bổ sung hồ sơ của mình. */
export function CastingApplication({ mode = 'create' }: { mode?: 'create' | 'edit' }) {
  const editing = mode === 'edit';
  const href = useDvvnHref();
  const session = useActorSession();
  const [loadError, setLoadError] = useState('');
  const [bannerLogin, setBannerLogin] = useState(false);
  const [nameHint, setNameHint] = useState(NAME_HINTS[0]);

  // Mỗi lần mở trang (tải lại hoặc vào lại form) đổi sang tên mẫu kế tiếp
  useEffect(() => {
    let turn = 0;
    try {
      turn = Number(localStorage.getItem(NAME_HINT_KEY) || 0) || 0;
      localStorage.setItem(NAME_HINT_KEY, String((turn + 1) % NAME_HINTS.length));
    } catch {
      turn = Math.floor(Math.random() * NAME_HINTS.length);
    }
    setNameHint(NAME_HINTS[turn % NAME_HINTS.length]);
  }, []);
  const [draft, setDraft] = useState<CastingDraft>(createEmptyDraft);
  const [step, setStep] = useState(1);
  const [maxVisited, setMaxVisited] = useState(1);
  const [showErrorsFor, setShowErrorsFor] = useState<number[]>([]);
  const [consentError, setConsentError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState('');
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [draftSaved, setDraftSaved] = useState<'idle' | 'saved' | 'failed'>('idle');
  const [hydrated, setHydrated] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [target, setTarget] = useState<ApplyTarget | null>(null);
  const [targetNotice, setTargetNotice] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectParam = searchParams.get('du-an');
  const roleParam = searchParams.get('vai');

  // Vào form từ trang dự án: chọn sẵn dự án & vai ứng tuyển
  useEffect(() => {
    if (editing || !projectParam || !roleParam) {
      setTarget(null);
      return;
    }
    let cancelled = false;
    fetchPublicProject(projectParam)
      .then(project => {
        if (cancelled) return;
        const role = project?.roles.find(r => r.id === roleParam);
        if (!project || !role) {
          setTargetNotice('Không tìm thấy dự án hoặc vai ứng tuyển. Bạn vẫn có thể nộp hồ sơ vào kho diễn viên.');
          setTarget(null);
        } else if (!isAcceptingApplications(project)) {
          setTargetNotice(`${project.display_name} đã ngừng nhận hồ sơ. Bạn vẫn có thể nộp hồ sơ vào kho diễn viên.`);
          setTarget(null);
        } else {
          setTargetNotice('');
          setTarget({ project, role });
        }
      })
      .catch(() => !cancelled && setTargetNotice('Không tải được thông tin dự án. Bạn vẫn có thể nộp hồ sơ.'));
    return () => {
      cancelled = true;
    };
  }, [editing, projectParam, roleParam]);

  const clearTarget = () => {
    setTarget(null);
    setTargetNotice('');
    router.replace(href('/nop-ho-so'));
  };

  const topRef = useRef<HTMLDivElement>(null);
  const consentRef = useRef<HTMLDivElement>(null);
  const mobileStepsRef = useRef<HTMLDivElement>(null);

  // Khôi phục bản nháp đang điền dở trên thiết bị
  useEffect(() => {
    if (editing) return;
    const saved = readJSON<{ draft: CastingDraft; step: number; maxVisited: number }>(DRAFT_KEY);
    if (saved?.draft) {
      const base = createEmptyDraft();
      setDraft({
        ...base,
        ...saved.draft,
        experience: { ...base.experience, ...(saved.draft.experience || {}) },
        social_links: { ...base.social_links, ...(saved.draft.social_links || {}) }
      });
      setStep(Math.min(Math.max(saved.step || 1, 1), CASTING_STEPS.length));
      setMaxVisited(Math.min(Math.max(saved.maxVisited || 1, 1), CASTING_STEPS.length));
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đã có tài khoản (đang đăng nhập) thì chỉnh sửa hồ sơ hiện có thay vì nộp hồ sơ mới
  useEffect(() => {
    if (!editing && session.status === 'signed-in' && !result) router.replace(href('/tai-khoan/ho-so'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, session.status]);

  // Chỉnh sửa: tải hồ sơ đã lưu của tài khoản đang đăng nhập
  useEffect(() => {
    if (!editing) return;
    if (session.status === 'signed-out') {
      router.replace(href(`/dang-nhap?next=${encodeURIComponent(href('/tai-khoan/ho-so'))}`));
      return;
    }
    if (session.status === 'unavailable') return setLoadError('Hệ thống tài khoản diễn viên chưa được kết nối.');
    if (session.status !== 'signed-in' || hydrated) return;
    (async () => {
      const res = await actorFetch('/api/dienvienvn/me');
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) return signOutActor();
      if (!res.ok || !body.draft) return setLoadError(body.error || 'Không tải được hồ sơ.');
      const base = createEmptyDraft();
      setDraft({
        ...base,
        ...body.draft,
        experience: { ...base.experience, ...(body.draft.experience || {}) },
        social_links: { ...base.social_links, ...(body.draft.social_links || {}) },
        consent: true
      });
      setMaxVisited(CASTING_STEPS.length);
      setHydrated(true);
    })().catch(() => setLoadError('Mất kết nối mạng. Vui lòng tải lại trang.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, session.status]);

  // Tự lưu nháp
  useEffect(() => {
    if (editing || !hydrated || result) return;
    const t = window.setTimeout(() => {
      setDraftSaved(writeJSON(DRAFT_KEY, { draft, step, maxVisited }) ? 'saved' : 'failed');
    }, 500);
    return () => window.clearTimeout(t);
  }, [editing, draft, step, maxVisited, hydrated, result]);

  // Giữ bước đang điền luôn hiển thị trên thanh bước (mobile)
  useEffect(() => {
    const el = mobileStepsRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [step]);

  const update = useCallback((patch: Partial<CastingDraft>) => {
    setDraft(d => ({ ...d, ...patch }));
    setBanner('');
    setBannerLogin(false);
  }, []);

  const allErrors = useMemo(() => {
    const map: Record<number, StepErrors> = {};
    const ctx = { selftapeRequired: target ? target.project.selftape_required : null };
    CASTING_STEPS.forEach(s => (map[s.id] = validateStep(s.id, draft, ctx)));
    return map;
  }, [draft, target]);

  const stepValid = (id: number) => Object.keys(allErrors[id] || {}).length === 0;
  const visibleErrors = showErrorsFor.includes(step) ? allErrors[step] : {};

  const stepState = (id: number): StepState => {
    if (id === step) return 'current';
    if (id > maxVisited) return 'upcoming';
    if (stepValid(id)) return 'done';
    return id < maxVisited || showErrorsFor.includes(id) ? 'error' : 'upcoming';
  };

  // % hoàn thành tính theo số trường đã điền; nút nộp chỉ sáng khi đã đi đủ 7 bước hợp lệ và đồng ý điều khoản
  const progress = computeCompletion(draft, maxVisited);
  const allStepsDone = maxVisited >= CASTING_STEPS.length && CASTING_STEPS.every(s => stepValid(s.id));
  const readyToSubmit = allStepsDone && draft.consent;

  const scrollToTop = () => {
    const y = (topRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 56;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  };

  const goTo = (target: number) => {
    if (target === step || submitting) return;
    if (target > step) {
      // Chỉ được nhảy tới khi các bước trước đã hợp lệ (giống Google Form)
      for (let i = 1; i < target; i++) {
        if (!stepValid(i)) {
          setShowErrorsFor(prev => Array.from(new Set([...prev, i])));
          setStep(i);
          setBanner(`Vui lòng hoàn thành “${CASTING_STEPS[i - 1].title}” trước khi tiếp tục.`);
          scrollToTop();
          return;
        }
      }
    }
    setBanner('');
    setStep(target);
    setMaxVisited(m => Math.max(m, target));
    scrollToTop();
  };

  const handleNext = () => {
    if (!stepValid(step)) {
      setShowErrorsFor(prev => Array.from(new Set([...prev, step])));
      setBanner('Vui lòng kiểm tra lại các trường được đánh dấu đỏ.');
      return;
    }
    goTo(Math.min(step + 1, CASTING_STEPS.length));
  };

  const handleBack = () => goTo(Math.max(step - 1, 1));

  const handleSubmit = async () => {
    if (submitting) return;
    const firstInvalid = CASTING_STEPS.find(s => !stepValid(s.id));
    if (firstInvalid) {
      setShowErrorsFor(prev => Array.from(new Set([...prev, firstInvalid.id])));
      setStep(firstInvalid.id);
      setMaxVisited(m => Math.max(m, firstInvalid.id));
      setBanner(`Hồ sơ còn thiếu thông tin ở bước ${firstInvalid.id}: ${firstInvalid.title}.`);
      scrollToTop();
      return;
    }
    if (!draft.consent) {
      setConsentError(true);
      consentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    setBanner('');
    setBannerLogin(false);

    if (editing) {
      try {
        const res = await actorFetch('/api/dienvienvn/me', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          if (typeof data.step === 'number') {
            setStep(data.step);
            setShowErrorsFor(prev => Array.from(new Set([...prev, data.step])));
          }
          setBanner(
            res.status === 401
              ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi lưu.'
              : data.error || 'Không lưu được thay đổi. Vui lòng thử lại.'
          );
          setBannerLogin(res.status === 401);
          scrollToTop();
          return;
        }
        router.push(href('/tai-khoan?da-luu=1'));
      } catch {
        setBanner('Mất kết nối mạng. Vui lòng thử lại.');
        scrollToTop();
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/dienvienvn/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft,
          website: honeypot,
          application: target
            ? { project_id: target.project.id, role_id: target.role.id, selftape_url: draft.selftape_url.trim() }
            : null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (typeof data.step === 'number') {
          setStep(data.step);
          setShowErrorsFor(prev => Array.from(new Set([...prev, data.step])));
        }
        setBanner(data.error || 'Không gửi được hồ sơ. Vui lòng kiểm tra kết nối mạng và thử lại.');
        setBannerLogin(!!data.emailExists);
        scrollToTop();
        return;
      }

      if (data.stored === 'local' && data.profile) {
        const list = readJSON<unknown[]>(LOCAL_SUBMISSIONS_KEY) || [];
        writeJSON(LOCAL_SUBMISSIONS_KEY, [data.profile, ...list]);
        if (target && !checkLocalApplication(target.project.id, target.role.id, draft.selftape_url)) {
          saveLocalApplication({
            project_id: target.project.id,
            role_id: target.role.id,
            talent_id: data.id,
            selftape_url: draft.selftape_url.trim() || null,
            note: null
          });
        }
      }

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* bỏ qua */
      }
      setResult({
        id: data.id,
        name: draft.full_name.trim(),
        email: draft.email.trim().toLowerCase(),
        emailSent: !!data.emailSent,
        appliedTo: target && data.applicationSaved !== false ? `${target.project.display_name} · vai ${target.role.name}` : null
      });
      window.scrollTo({ top: 0 });
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        confetti({ particleCount: 90, spread: 70, startVelocity: 38, origin: { y: 0.35 }, colors: ['#1d1d1f', '#86868b', '#d2d2d7', '#ffffff'] });
      }
    } catch {
      setBanner('Mất kết nối mạng. Hồ sơ của bạn vẫn được lưu nháp — vui lòng thử nộp lại.');
      scrollToTop();
    } finally {
      setSubmitting(false);
    }
  };

  const resetForAnother = () => {
    setDraft(createEmptyDraft());
    setStep(1);
    setMaxVisited(1);
    setShowErrorsFor([]);
    setConsentError(false);
    setResult(null);
    window.scrollTo({ top: 0 });
  };

  if (result) {
    return (
      <>
        <GlobalNav />
        <SuccessScreen result={result} homeHref={href('/')} onAnother={resetForAnother} />
      </>
    );
  }

  if (editing && !hydrated) {
    return (
      <>
        <GlobalNav />
        <main className="flex min-h-[70vh] flex-col items-center justify-center bg-[var(--dv-bg-alt)] px-4 text-center">
          {loadError ? (
            <>
              <p className="text-[17px]">{loadError}</p>
              <Link href={href('/tai-khoan')} className="dv-btn dv-btn-secondary mt-6">
                Về tài khoản
              </Link>
            </>
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-[var(--dv-text-secondary)]" />
          )}
        </main>
      </>
    );
  }

  const StepComponent = STEP_COMPONENTS[step];
  const current = CASTING_STEPS[step - 1];
  const isLast = step === CASTING_STEPS.length;
  const age = ageFromDob(draft.dob);

  const submitButton = (extra = '') => (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={submitting}
      aria-disabled={!readyToSubmit}
      className={`dv-btn ${readyToSubmit ? 'dv-btn-primary' : 'dv-btn-muted'} ${extra}`}
    >
      {submitting ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Send className="h-4 w-4" />}
      {editing ? (submitting ? 'Đang lưu…' : 'Lưu thay đổi') : submitting ? 'Đang gửi hồ sơ…' : 'Nộp hồ sơ casting'}
    </button>
  );

  return (
    <>
      <GlobalNav />

      {/* Thanh bước trên mobile / tablet */}
      <div className="sticky top-11 z-40 border-b border-black/[0.06] bg-[rgba(245,245,247,0.86)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto max-w-[720px] px-4 pt-2.5">
          <div className="flex items-center justify-between text-[12px] tracking-[-0.01em]">
            <span className="font-semibold text-[var(--dv-text)]">
              Bước {step}/{CASTING_STEPS.length} · {current.title}
            </span>
            <span className="text-[var(--dv-text-secondary)]">{progress}%</span>
          </div>
          <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-[#e8e8ed]">
            <div className="h-full rounded-full bg-[var(--dv-accent)] transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <div ref={mobileStepsRef} className="dv-scroll-x -mx-4 flex gap-2 overflow-x-auto px-4 py-2.5">
            {CASTING_STEPS.map(s => {
              const st = stepState(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  data-step={s.id}
                  onClick={() => goTo(s.id)}
                  aria-current={st === 'current' ? 'step' : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] tracking-[-0.01em] transition-colors ${
                    st === 'current'
                      ? 'bg-[#1d1d1f] text-white'
                      : st === 'error'
                        ? 'bg-[#fff0f0] text-[var(--dv-red)]'
                        : st === 'done'
                          ? 'bg-white text-[var(--dv-text)]'
                          : 'bg-transparent text-[var(--dv-text-secondary)]'
                  }`}
                >
                  {st === 'done' ? <Check className="h-3.5 w-3.5 text-[var(--dv-accent)]" strokeWidth={3} /> : st === 'error' ? <AlertCircle className="h-3.5 w-3.5" /> : <span className="font-semibold">{s.id}</span>}
                  {s.title}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="min-h-screen bg-[var(--dv-bg-alt)] pb-28 lg:pb-16">
        <div ref={topRef} className="mx-auto max-w-[1320px] px-4 pt-6 md:px-6 lg:pt-10">
          {/* Tiêu đề trang */}
          <header className="mb-6 lg:mb-8">
            <Link href={href(editing ? '/tai-khoan' : '/')} className="dv-link text-[14px]">
              <ChevronLeft className="h-4 w-4" /> {editing ? 'Tài khoản của tôi' : 'Trang chủ DienVienVN'}
            </Link>
            <h1 className="dv-display mt-2 text-[28px] font-semibold leading-[1.14] tracking-[0.007em] md:text-[40px] md:leading-[1.1] md:tracking-normal">
              {editing ? 'Chỉnh sửa hồ sơ.' : target ? 'Ứng tuyển casting.' : 'Nộp hồ sơ casting.'}
            </h1>
            {target && (
              <div className="mt-4 flex items-center gap-3 rounded-[14px] bg-white px-4 py-3 md:max-w-[640px]">
                <Clapperboard className="h-5 w-5 shrink-0 text-[var(--dv-accent)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{target.project.display_name}</p>
                  <p className="truncate text-[13px] text-[var(--dv-text-secondary)]">
                    Vai {target.role.name}
                    {target.project.selftape_required ? ' · Bắt buộc self-tape (bước 6)' : ''}
                  </p>
                </div>
                <button type="button" onClick={clearTarget} aria-label="Bỏ ứng tuyển dự án này" className="rounded-full p-1.5 text-[var(--dv-text-secondary)] hover:bg-[var(--dv-bg-alt)]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {targetNotice && <p className="mt-3 text-[14px] text-[var(--dv-text-secondary)]">{targetNotice}</p>}
          </header>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[228px_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[248px_minmax(0,1fr)_300px]">
            {/* CỘT TRÁI: các bước */}
            <aside className="hidden lg:row-span-2 lg:block xl:row-span-1" aria-label="Các bước nộp hồ sơ">
              <nav className="sticky top-[68px]">
                <p className="mb-3 px-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--dv-text-secondary)]">Các bước</p>
                <ol className="relative">
                  {CASTING_STEPS.map((s, i) => {
                    const st = stepState(s.id);
                    const isLastItem = i === CASTING_STEPS.length - 1;
                    const lineActive = s.id < step;
                    return (
                      <li key={s.id} className="relative">
                        {!isLastItem && (
                          <span
                            aria-hidden="true"
                            className={`absolute left-[25px] top-[42px] h-[calc(100%-28px)] w-[2px] rounded-full transition-colors duration-500 ${
                              lineActive ? 'bg-[var(--dv-accent)]' : 'bg-[#d2d2d7]'
                            }`}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => goTo(s.id)}
                          aria-current={st === 'current' ? 'step' : undefined}
                          className={`group relative flex w-full items-start gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors ${
                            st === 'current' ? 'bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]' : 'hover:bg-white/60'
                          }`}
                        >
                          <span
                            className={`relative z-[1] mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-all duration-300 ${
                              st === 'current'
                                ? 'bg-[var(--dv-accent)] text-white ring-4 ring-[rgba(29,29,31,0.15)]'
                                : st === 'done'
                                  ? 'bg-[var(--dv-accent)] text-white'
                                  : st === 'error'
                                    ? 'bg-[var(--dv-red)] text-white'
                                    : 'border-2 border-[#d2d2d7] bg-[var(--dv-bg-alt)] text-[var(--dv-text-secondary)]'
                            }`}
                          >
                            {st === 'done' ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : st === 'error' ? '!' : s.id}
                          </span>
                          <span className="min-w-0 pt-0.5">
                            <span
                              className={`block text-[15px] leading-[1.25] tracking-[-0.016em] ${
                                st === 'current' ? 'font-semibold text-[var(--dv-text)]' : st === 'upcoming' ? 'text-[var(--dv-text-secondary)]' : 'text-[var(--dv-text)]'
                              }`}
                            >
                              {s.title}
                            </span>
                            <span className="mt-0.5 block text-[12px] leading-[1.33] text-[var(--dv-text-tertiary)]">{s.desc}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </aside>

            {/* CỘT GIỮA: nội dung bước */}
            <section className="min-w-0">
              <div className="dv-card overflow-hidden">
                <div className="border-b border-[#f0f0f2] px-5 pb-5 pt-6 sm:px-8 sm:pt-8">
                  <p className="text-[14px] font-semibold text-[var(--dv-accent)]">
                    Bước {step} / {CASTING_STEPS.length}
                  </p>
                  <h2 className="dv-display mt-1 text-[24px] font-semibold leading-[1.17] tracking-[0.009em] sm:text-[28px] sm:leading-[1.14]">
                    {current.title}
                  </h2>
                  <p className="mt-1.5 text-[15px] leading-[1.47] text-[var(--dv-text-secondary)]">{STEP_INTROS[step]}</p>
                </div>

                {banner && (
                  <div role="alert" className="mx-5 mt-5 flex items-start gap-2.5 rounded-[12px] bg-[#fff0f0] p-3.5 text-[14px] leading-[1.43] text-[#b00020] sm:mx-8">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {banner}
                      {bannerLogin && (
                        <>
                          {' '}
                          <Link
                            href={href(`/dang-nhap?next=${encodeURIComponent(href(editing ? '/tai-khoan/ho-so' : '/tai-khoan'))}`)}
                            className="font-semibold underline underline-offset-2"
                          >
                            Đăng nhập
                          </Link>
                        </>
                      )}
                    </span>
                  </div>
                )}

                <div key={step} className="dv-fade-step px-5 py-6 sm:px-8 sm:py-8">
                  <StepComponent
                    draft={draft}
                    update={update}
                    errors={visibleErrors}
                    emailLocked={editing}
                    namePlaceholder={nameHint}
                    application={
                      target
                        ? {
                            projectName: target.project.display_name,
                            roleName: target.role.name,
                            selftapeRequired: target.project.selftape_required,
                            selftapeBrief: target.project.selftape_brief
                          }
                        : null
                    }
                  />
                </div>

                {/* Điều hướng trong thẻ (desktop / tablet) */}
                <div className="hidden items-center justify-between border-t border-[#f0f0f2] px-5 py-5 sm:px-8 md:flex">
                  <button type="button" onClick={handleBack} disabled={step === 1} className="dv-btn dv-btn-ghost disabled:invisible">
                    <ChevronLeft className="h-4 w-4" /> Quay lại
                  </button>
                  {isLast ? (
                    submitButton()
                  ) : (
                    <button type="button" onClick={handleNext} className="dv-btn dv-btn-primary">
                      Tiếp theo <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Honeypot chống spam (ẩn với người dùng) */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Website
                  <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
                </label>
              </div>
            </section>

            {/* CỘT PHẢI: tóm tắt & nộp hồ sơ */}
            <aside aria-label="Nộp hồ sơ" className="lg:col-start-2 xl:col-start-auto">
              <div className="space-y-4 xl:sticky xl:top-[68px]">
                <div className="dv-card p-5">
                  <div className="flex items-center gap-3.5">
                    <div className="h-[72px] w-[56px] shrink-0 overflow-hidden rounded-[10px] bg-[#e8e8ed]">
                      {draft.headshot_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={draft.headshot_url} alt="" className="h-full w-full object-cover object-top" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#aeaeb2]">
                          <UserRound className="h-7 w-7" strokeWidth={1.4} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[17px] font-semibold leading-[1.24] tracking-[-0.022em]">
                        {draft.full_name.trim() || 'Hồ sơ của bạn'}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-[1.38] text-[var(--dv-text-secondary)]">
                        {[
                          draft.gender === 'female' ? 'Nữ' : draft.gender === 'male' ? 'Nam' : 'Khác',
                          age !== null && age >= 0 ? `${age} tuổi` : null,
                          draft.height_cm ? `${draft.height_cm} cm` : null,
                          draft.city.trim() || null
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-end justify-between">
                      <span className="text-[14px] text-[var(--dv-text-secondary)]">Hồ sơ đã hoàn thành</span>
                      <span className="dv-display text-[28px] font-semibold leading-none tracking-[0.007em] tabular-nums">{progress}%</span>
                    </div>
                    <div
                      className="mt-3 h-2 overflow-hidden rounded-full bg-[#e8e8ed]"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress}
                      aria-label="Mức độ hoàn thành hồ sơ"
                    >
                      <div
                        className={`h-full rounded-full transition-[width,background-color] duration-700 ease-out ${progress === 100 ? 'bg-[var(--dv-accent)]' : 'bg-[var(--dv-accent)]'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div ref={consentRef} className={`mt-5 border-t border-[#f0f0f2] pt-5 ${editing ? 'hidden' : ''}`}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={draft.consent}
                      onClick={() => {
                        update({ consent: !draft.consent });
                        setConsentError(false);
                      }}
                      className="flex w-full items-start gap-2.5 text-left"
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
                          draft.consent
                            ? 'border-[var(--dv-accent)] bg-[var(--dv-accent)] text-white'
                            : consentError
                              ? 'border-[var(--dv-red)] bg-white'
                              : 'border-[#c7c7cc] bg-white'
                        }`}
                      >
                        {draft.consent && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                      <span className="text-[13px] leading-[1.42] text-[var(--dv-text-secondary)]">
                        Tôi xác nhận thông tin là chính xác và đồng ý để DienVienVN lưu trữ, gửi hồ sơ này tới đạo diễn và nhà sản xuất
                        cho mục đích casting.
                      </span>
                    </button>
                    {consentError && <p className="dv-field-error">Vui lòng đánh dấu đồng ý để nộp hồ sơ.</p>}
                  </div>

                  <div className="mt-5">{submitButton('w-full')}</div>
                  {!readyToSubmit && (
                    <p className="mt-2.5 text-center text-[12px] leading-[1.33] text-[var(--dv-text-secondary)]">
                      {editing
                        ? 'Kiểm tra lại các bước được đánh dấu đỏ để lưu.'
                        : allStepsDone
                          ? 'Đánh dấu đồng ý ở trên để nộp hồ sơ.'
                          : 'Hoàn thành đủ 7 bước để nộp hồ sơ.'}
                    </p>
                  )}
                </div>

                <p className="px-2 text-[12px] leading-[1.33] text-[var(--dv-text-secondary)]">
                  {editing ? (
                    'Thay đổi chỉ được lưu khi bạn bấm “Lưu thay đổi”. Email đăng nhập không thể thay đổi.'
                  ) : (
                    <>
                  {draftSaved === 'saved'
                    ? 'Bản nháp được tự động lưu trên thiết bị này.'
                    : draftSaved === 'failed'
                      ? 'Không lưu được bản nháp trên thiết bị này (bộ nhớ trình duyệt đầy hoặc bị chặn).'
                      : 'Bản nháp sẽ được tự động lưu trên thiết bị này.'}{' '}
                  Hồ sơ chỉ được gửi đi khi bạn bấm “Nộp hồ sơ casting”.
                    </>
                  )}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Thanh điều hướng cố định cho điện thoại */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.08] bg-[rgba(255,255,255,0.92)] px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-[720px] items-center gap-3">
          <button type="button" onClick={handleBack} disabled={step === 1} className="dv-btn dv-btn-ghost shrink-0 px-4 disabled:opacity-40" aria-label="Quay lại bước trước">
            <ChevronLeft className="h-4 w-4" /> Quay lại
          </button>
          {isLast ? (
            submitButton('flex-1')
          ) : (
            <button type="button" onClick={handleNext} className="dv-btn dv-btn-primary flex-1">
              Tiếp theo <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function SuccessScreen({ result, homeHref, onAnother }: { result: SubmitResult; homeHref: string; onAnother: () => void }) {
  const code = `DV-${result.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
  return (
    <main className="flex min-h-[calc(100vh-44px)] items-center justify-center bg-[var(--dv-bg-alt)] px-4 py-12">
      <div className="dv-pop dv-card w-full max-w-[640px] px-6 py-12 text-center shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)] sm:px-14 sm:py-16">
        <svg className="mx-auto h-[88px] w-[88px] sm:h-[104px] sm:w-[104px]" viewBox="0 0 56 56" aria-hidden="true">
          <circle className="dv-check-circle" cx="28" cy="28" r="26" fill="none" stroke="#1d1d1f" strokeWidth="2.5" />
          <path className="dv-check-mark" d="M17 29.5l7 7 15-16" fill="none" stroke="#1d1d1f" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <h1 className="dv-display dv-headline mt-7" role="status">
          Nộp hồ sơ thành công.
        </h1>
        <p className="dv-subhead mx-auto mt-3 max-w-[460px] text-[var(--dv-text-secondary)]">
          Cảm ơn {result.name}. Hồ sơ của bạn đã đến tay đội ngũ casting DienVienVN.
        </p>

        <div className="mx-auto mt-8 max-w-[420px] rounded-[16px] bg-[var(--dv-bg-alt)] p-5 text-left">
          <div className="flex items-center justify-between gap-4 text-[15px]">
            <span className="text-[var(--dv-text-secondary)]">Mã hồ sơ</span>
            <span className="font-semibold tracking-[0.04em]">{code}</span>
          </div>
          {result.appliedTo && (
            <>
              <div className="mt-3 h-px bg-[#e8e8ed]" />
              <div className="mt-3 flex items-start justify-between gap-4 text-[15px]">
                <span className="shrink-0 text-[var(--dv-text-secondary)]">Ứng tuyển</span>
                <span className="text-right font-semibold">{result.appliedTo}</span>
              </div>
            </>
          )}
          <div className="mt-3 h-px bg-[#e8e8ed]" />
          <p className="mt-3 text-[14px] leading-[1.43] text-[var(--dv-text-secondary)]">
            Chúng tôi sẽ liên hệ qua email <span className="break-all font-semibold text-[var(--dv-text)]">{result.email}</span> khi có vai
            diễn phù hợp với bạn.
          </p>
        </div>

        <div className="mx-auto mt-4 flex max-w-[420px] items-start gap-3 rounded-[16px] border border-[#d2d2d7] p-5 text-left">
          <Mail className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-[14px] leading-[1.43] text-[var(--dv-text-secondary)]">
            {result.emailSent ? (
              <>
                <span className="font-semibold text-[var(--dv-text)]">Kiểm tra hộp thư của bạn.</span> Mở email xác nhận để tạo mật khẩu — sau
                đó bạn có thể đăng nhập, chỉnh sửa hồ sơ và tự ứng tuyển các dự án đang casting. Nếu không thấy, hãy xem mục Spam.
              </>
            ) : (
              <>
                <span className="font-semibold text-[var(--dv-text)]">Kích hoạt tài khoản</span> để chỉnh sửa hồ sơ và tự ứng tuyển các dự án
                đang casting: vào trang Đăng nhập → “Quên mật khẩu / chưa nhận được email kích hoạt?”.
              </>
            )}
          </p>
        </div>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link href={homeHref} className="dv-btn dv-btn-primary w-full sm:w-auto">
            Về trang chủ
          </Link>
          <button type="button" onClick={onAnother} className="dv-btn dv-btn-secondary w-full sm:w-auto">
            Nộp hồ sơ khác
          </button>
        </div>
        <p className="mt-8 text-[12px] text-[var(--dv-text-tertiary)]">Hẹn gặp bạn ngày ra mắt chính thức — 11.11.2026.</p>
      </div>
    </main>
  );
}
