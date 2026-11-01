'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, Save, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCRM } from '@/lib/store/crm-context';
import { useGuests } from '@/lib/guests/use-guests';
import {
  INVITATION_STATUS,
  INVITATION_STATUS_LIST,
  InvitationStatus,
  REVIEWER_PRESETS,
  SUITABLE_FOR_PRESETS,
  ShowcaseGuest,
  ShowcaseInvitation,
  guestStats,
  termNumber
} from '@/lib/guests/types';

const inputCls = 'w-full h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:border-foreground transition-colors';
const areaCls = 'w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:border-foreground transition-colors leading-relaxed resize-y';
const labelCls = 'block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1';

function emptyGuest(): ShowcaseGuest {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    full_name: '',
    call_name: null,
    title: null,
    phone: null,
    email: null,
    bio: null,
    photo_url: null,
    talkativity: null,
    judge_notes: null,
    contact_future: null,
    suitable_for: [],
    created_at: now,
    updated_at: now
  };
}

export function GuestDetail({ guestId }: { guestId: string | null }) {
  const router = useRouter();
  const { currentUser } = useCRM();
  const store = useGuests();
  const isNew = guestId === null;
  const original = useMemo(() => (isNew ? null : store.guests.find(g => g.id === guestId) || null), [isNew, store.guests, guestId]);
  const [form, setForm] = useState<ShowcaseGuest | null>(isNew ? emptyGuest() : null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew && original && (!form || form.id !== original.id)) setForm(original);
  }, [isNew, original, form]);

  if (!isNew && store.loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!form) {
    return (
      <div className="p-10 rounded-2xl border bg-card text-center space-y-3">
        <p className="font-semibold">Không tìm thấy khách mời</p>
        <Link href="/guests" className="text-sm underline">
          Về danh sách khách mời
        </Link>
      </div>
    );
  }

  const set = (patch: Partial<ShowcaseGuest>) => setForm(f => (f ? { ...f, ...patch } : f));
  const text = (v: string) => (v.trim() ? v : null);
  const invs = store.invitations.filter(i => i.guest_id === form.id);
  const revs = store.reviews.filter(r => r.guest_id === form.id);
  const stats = guestStats(invs);
  const dirty = isNew || JSON.stringify(form) !== JSON.stringify(original);

  const save = async () => {
    if (form.full_name.trim().length < 2) return toast.error('Vui lòng nhập họ tên khách mời');
    setSaving(true);
    const saved = await store.saveGuest({ ...form, created_by: form.created_by || currentUser?.email || null });
    setSaving(false);
    if (!saved) return;
    toast.success(isNew ? 'Đã thêm khách mời' : 'Đã lưu thay đổi');
    if (isNew) router.replace(`/guests/${saved.id}`);
    else setForm(saved);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <Link href="/guests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Khách mời showcase
        </Link>
        {!isNew && (
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm(`Xoá khách mời "${form.full_name}" cùng toàn bộ lịch sử mời và nhận xét?`)) return;
              await store.deleteGuest(form.id);
              router.push('/guests');
            }}
            className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border text-xs font-semibold text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> Xoá
          </button>
        )}
      </div>

      <div className="flex items-start gap-4">
        {form.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.photo_url} alt="" className="w-16 h-16 rounded-2xl object-cover object-top border" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground">
            {(form.call_name || form.full_name || '?').trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{form.full_name || 'Khách mời mới'}</h1>
          <p className="text-sm text-muted-foreground">
            {[form.title, !isNew ? `Đã tham dự ${stats.attended} lần` : null, stats.terms.length ? `Gần nhất ${stats.terms.sort((a, b) => termNumber(b) - termNumber(a))[0]}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      {/* Thông tin */}
      <section className="bg-card rounded-2xl border p-5 sm:p-6 space-y-4">
        <h3 className="font-bold text-sm border-b pb-3">Thông tin khách mời</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Họ tên *</label>
            <input className={inputCls} value={form.full_name} onChange={e => set({ full_name: e.target.value })} placeholder="VD: Mai Thế Hiệp" />
          </div>
          <div>
            <label className={labelCls}>Tên gọi</label>
            <input className={inputCls} value={form.call_name || ''} onChange={e => set({ call_name: text(e.target.value) })} placeholder="VD: anh Hiệp" />
          </div>
          <div>
            <label className={labelCls}>Chức danh</label>
            <input className={inputCls} value={form.title || ''} onChange={e => set({ title: text(e.target.value) })} placeholder="Đạo diễn, Nhà sản xuất, Casting Director…" />
          </div>
          <div>
            <label className={labelCls}>Ảnh (link)</label>
            <input className={inputCls} value={form.photo_url || ''} onChange={e => set({ photo_url: text(e.target.value) })} placeholder="https://" />
          </div>
          <div>
            <label className={labelCls}>Số điện thoại</label>
            <input className={inputCls} inputMode="tel" value={form.phone || ''} onChange={e => set({ phone: text(e.target.value) })} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} type="email" value={form.email || ''} onChange={e => set({ email: text(e.target.value) })} />
          </div>
          <div>
            <label className={labelCls}>Mức độ chia sẻ / nói chuyện</label>
            <select className={inputCls} value={form.talkativity ?? ''} onChange={e => set({ talkativity: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Chưa đánh giá</option>
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>
                  {n} – {['Rất ít nói', 'Ít nói', 'Vừa phải', 'Cởi mở', 'Rất cởi mở, nhiều chia sẻ'][n - 1]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Liên hệ mời tiếp</label>
            <select
              className={inputCls}
              value={form.contact_future === null ? '' : form.contact_future ? 'yes' : 'no'}
              onChange={e => set({ contact_future: e.target.value === '' ? null : e.target.value === 'yes' })}
            >
              <option value="">Chưa quyết định</option>
              <option value="yes">Có – mời tiếp các showcase sau</option>
              <option value="no">Không</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Phù hợp cho</label>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(new Set([...SUITABLE_FOR_PRESETS, ...form.suitable_for])).map(s => {
              const on = form.suitable_for.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => set({ suitable_for: on ? form.suitable_for.filter(x => x !== s) : [...form.suitable_for, s] })}
                  className={`h-8 px-3 rounded-full border text-xs font-medium transition-colors ${on ? 'bg-[#1d1d1f] text-white border-[#1d1d1f]' : 'hover:bg-muted'}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className={labelCls}>Tiểu sử</label>
          <textarea rows={4} className={areaCls} value={form.bio || ''} onChange={e => set({ bio: text(e.target.value) })} />
        </div>
        <div>
          <label className={labelCls}>Nhận xét tiềm năng làm giám khảo</label>
          <textarea rows={3} className={areaCls} value={form.judge_notes || ''} onChange={e => set({ judge_notes: text(e.target.value) })} placeholder="VD: Thân thiện, nhận xét tốt, hợp làm giám khảo ACT2…" />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="h-10 inline-flex items-center gap-2 px-5 rounded-xl bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isNew ? 'Thêm khách mời' : 'Lưu thay đổi'}
          </button>
        </div>
      </section>

      {!isNew && original && (
        <>
          <InvitationsSection guestId={form.id} invitations={invs} allTerms={Array.from(new Set(store.invitations.map(i => i.term)))} store={store} />
          <ReviewsSection guestId={form.id} store={store} reviews={revs} author={currentUser?.full_name || currentUser?.email || null} />
        </>
      )}
    </div>
  );
}

function InvitationsSection({
  guestId,
  invitations,
  allTerms,
  store
}: {
  guestId: string;
  invitations: ShowcaseInvitation[];
  allTerms: string[];
  store: ReturnType<typeof useGuests>;
}) {
  const [term, setTerm] = useState('');
  const [cls, setCls] = useState('');
  const [session, setSession] = useState('');
  const [status, setStatus] = useState<InvitationStatus>('confirmed');
  const [note, setNote] = useState('');
  const groups = useMemo(() => {
    const m = new Map<string, ShowcaseInvitation[]>();
    invitations.forEach(i => m.set(i.term, [...(m.get(i.term) || []), i]));
    return Array.from(m.entries()).sort((a, b) => termNumber(b[0]) - termNumber(a[0]));
  }, [invitations]);

  const add = async () => {
    if (!term.trim()) return toast.error('Nhập Term, VD: TERM 37');
    const now = new Date().toISOString();
    const ok = await store.saveInvitation({
      id: crypto.randomUUID(),
      guest_id: guestId,
      term: /^\d+$/.test(term.trim()) ? `TERM ${term.trim()}` : term,
      class_code: cls.trim() || null,
      session: session.trim() || null,
      status,
      note: note.trim() || null,
      created_at: now,
      updated_at: now
    });
    if (ok) {
      setCls('');
      setSession('');
      setNote('');
    }
  };

  return (
    <section className="bg-card rounded-2xl border p-5 sm:p-6 space-y-4">
      <h3 className="font-bold text-sm border-b pb-3">Lịch sử showcase ({invitations.length})</h3>

      <div className="grid grid-cols-2 sm:grid-cols-[110px_110px_100px_150px_minmax(0,1fr)_auto] gap-2 items-end">
        <div>
          <label className={labelCls}>Term *</label>
          <input className={inputCls} list="guest-terms" value={term} onChange={e => setTerm(e.target.value.toUpperCase())} placeholder="TERM 37" />
          <datalist id="guest-terms">
            {allTerms.sort((a, b) => termNumber(b) - termNumber(a)).map(t => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={labelCls}>Lớp</label>
          <input className={inputCls} value={cls} onChange={e => setCls(e.target.value.toUpperCase())} placeholder="ACT1A" />
        </div>
        <div>
          <label className={labelCls}>Buổi</label>
          <input className={inputCls} value={session} onChange={e => setSession(e.target.value)} placeholder="AM / PM" />
        </div>
        <div>
          <label className={labelCls}>Trạng thái</label>
          <select className={inputCls} value={status} onChange={e => setStatus(e.target.value as InvitationStatus)}>
            {INVITATION_STATUS_LIST.map(s => (
              <option key={s} value={s}>
                {INVITATION_STATUS[s].label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelCls}>Ghi chú</label>
          <input className={inputCls} value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        </div>
        <button type="button" onClick={add} className="h-10 inline-flex items-center justify-center gap-1.5 px-4 rounded-lg bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold col-span-2 sm:col-span-1">
          <Plus className="w-4 h-4" /> Thêm
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Chưa có lịch sử mời.</p>
      ) : (
        <div className="space-y-4">
          {groups.map(([t, list]) => (
            <div key={t}>
              <p className="text-xs font-bold mb-1.5">{t}</p>
              <div className="rounded-xl border divide-y">
                {list
                  .slice()
                  .sort((a, b) => (a.class_code || '').localeCompare(b.class_code || '') || (a.session || '').localeCompare(b.session || ''))
                  .map(i => (
                    <div key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 text-sm">
                      <span className="w-28 font-medium truncate">{i.class_code || '—'}</span>
                      <span className="w-20 text-muted-foreground text-xs">{i.session || ''}</span>
                      <select
                        value={i.status}
                        onChange={e => store.saveInvitation({ ...i, status: e.target.value as InvitationStatus })}
                        className={`h-7 px-2 rounded-full border text-xs font-semibold outline-none ${INVITATION_STATUS[i.status].badge}`}
                        aria-label="Trạng thái"
                      >
                        {INVITATION_STATUS_LIST.map(s => (
                          <option key={s} value={s}>
                            {INVITATION_STATUS[s].label}
                          </option>
                        ))}
                      </select>
                      <span className="flex-1 min-w-[120px] text-xs text-muted-foreground">{i.note || ''}</span>
                      <button type="button" onClick={() => store.deleteInvitation(i.id)} className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600" aria-label="Xoá">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ReviewsSection({
  guestId,
  reviews,
  store,
  author
}: {
  guestId: string;
  reviews: ReturnType<typeof useGuests>['reviews'];
  store: ReturnType<typeof useGuests>;
  author: string | null;
}) {
  const [reviewer, setReviewer] = useState(REVIEWER_PRESETS[0]);
  const [custom, setCustom] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [term, setTerm] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const who = reviewer === 'other' ? custom.trim() : reviewer;
    if (!who) return toast.error('Nhập tên người nhận xét');
    if (!content.trim()) return toast.error('Nhập nội dung nhận xét');
    setBusy(true);
    const ok = await store.addReview({ guest_id: guestId, reviewer: who, rating, term: term.trim().toUpperCase() || null, content: content.trim(), created_by: author });
    setBusy(false);
    if (ok) {
      setContent('');
      setRating(null);
      setTerm('');
    }
  };

  return (
    <section className="bg-card rounded-2xl border p-5 sm:p-6 space-y-4">
      <h3 className="font-bold text-sm border-b pb-3">Nhận xét về khách mời ({reviews.length})</h3>
      <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)_120px] gap-2">
          <div>
            <label className={labelCls}>Người nhận xét</label>
            <select className={inputCls} value={reviewer} onChange={e => setReviewer(e.target.value)}>
              {REVIEWER_PRESETS.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="other">Người khác…</option>
            </select>
          </div>
          {reviewer === 'other' ? (
            <div>
              <label className={labelCls}>Tên</label>
              <input className={inputCls} value={custom} onChange={e => setCustom(e.target.value)} placeholder="VD: Phong" />
            </div>
          ) : (
            <div>
              <label className={labelCls}>Đánh giá</label>
              <Stars value={rating} onChange={setRating} />
            </div>
          )}
          <div>
            <label className={labelCls}>Term</label>
            <input className={inputCls} value={term} onChange={e => setTerm(e.target.value)} placeholder="TERM 36" />
          </div>
        </div>
        {reviewer === 'other' && (
          <div>
            <label className={labelCls}>Đánh giá</label>
            <Stars value={rating} onChange={setRating} />
          </div>
        )}
        <textarea rows={3} className={areaCls} value={content} onChange={e => setContent(e.target.value)} placeholder="VD: Nhận xét có tâm, học viên rất thích, nên mời lại showcase ACT2…" />
        <div className="flex justify-end">
          <button type="button" onClick={add} disabled={busy} className="h-10 inline-flex items-center gap-2 px-4 rounded-lg bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold disabled:opacity-40">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Thêm nhận xét
          </button>
        </div>
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có nhận xét.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map(r => (
            <li key={r.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm">
                  <span className="font-semibold">{r.reviewer}</span>
                  {r.term && <span className="text-muted-foreground"> · {r.term}</span>}
                  <span className="text-muted-foreground text-xs"> · {new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
                  {r.rating && (
                    <span className="ml-2 inline-flex align-middle">
                      {Array.from({ length: 5 }, (_, k) => (
                        <Star key={k} className={`w-3.5 h-3.5 ${k < (r.rating || 0) ? 'fill-[#c9a063] text-[#c9a063]' : 'text-muted-foreground/40'}`} />
                      ))}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => window.confirm('Xoá nhận xét này?') && store.deleteReview(r.id)}
                  className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Xoá nhận xét"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="mt-1.5 text-sm whitespace-pre-line leading-relaxed">{r.content}</p>
              {r.created_by && <p className="mt-1 text-[11px] text-muted-foreground">Ghi bởi {r.created_by}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stars({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="h-10 flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(value === n ? null : n)} aria-label={`${n} sao`} className="p-0.5">
          <Star className={`w-5 h-5 ${value && n <= value ? 'fill-[#c9a063] text-[#c9a063]' : 'text-muted-foreground/40 hover:text-[#c9a063]'}`} />
        </button>
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{value ? `${value}/5` : 'Không bắt buộc'}</span>
    </div>
  );
}
