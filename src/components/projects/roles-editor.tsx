'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Copy, Eye, EyeOff, ImagePlus, Link2, ListPlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import { MAX_SELFTAPE_REQUESTS, ProjectRole, ROLE_MAX_IMAGES, ROLE_TIERS, RoleGender, RoleTier, SelftapeRequest, genderLabel, roleTierLabel } from '@/lib/projects/types';
import { AcademyMarkdown } from '@/components/dienvienvn/academy-markdown';
import { uploadPublicImage } from '@/components/dienvienvn/form-fields';

const inputCls = 'w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:border-foreground transition-colors';
const labelCls = 'block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1';

export function emptyRole(name = ''): ProjectRole {
  return { id: crypto.randomUUID().slice(0, 8), name, gender: 'any', age_min: null, age_max: null, quantity: 1, description: '' };
}

function roleSummaryLine(r: ProjectRole): string {
  const age = r.age_min && r.age_max ? `${r.age_min}–${r.age_max} tuổi` : r.age_min ? `từ ${r.age_min} tuổi` : r.age_max ? `đến ${r.age_max} tuổi` : null;
  const tapes = (r.selftape_requests || []).length;
  return [roleTierLabel(r.tier), genderLabel(r.gender), age, r.quantity ? `${r.quantity} người` : null, tapes ? `${tapes} yêu cầu self-tape` : null].filter(Boolean).join(' · ');
}

const hasContent = (r: ProjectRole) => !!(r.name.trim() || (r.description || '').trim());

/**
 * Danh sách vai của dự án, dễ thao tác khi có nhiều vai:
 * thu gọn từng vai, thêm nhanh nhiều vai một lúc, nhân bản, đổi thứ tự, nút "Thêm vai" ở cuối danh sách.
 */
export function RolesEditor({ roles, onChange, canEdit }: { roles: ProjectRole[]; onChange: (roles: ProjectRole[]) => void; canEdit: boolean }) {
  // Dự án có sẵn nhiều vai: mở sẵn vai chưa có tên, thu gọn các vai đã điền
  const [open, setOpen] = useState<Set<string>>(() => new Set(roles.length > 3 ? roles.filter(r => !r.name.trim()).map(r => r.id) : roles.map(r => r.id)));
  const [bulk, setBulk] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const nameRefs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    if (!focusId) return;
    const el = nameRefs.current.get(focusId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
    }
    setFocusId(null);
  }, [focusId, roles]);

  const setRole = (id: string, patch: Partial<ProjectRole>) => onChange(roles.map(r => (r.id === id ? { ...r, ...patch } : r)));
  const toggle = (id: string) => setOpen(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const add = (after?: number) => {
    const role = emptyRole();
    const next = [...roles];
    next.splice(after === undefined ? next.length : after + 1, 0, role);
    onChange(next);
    setOpen(prev => new Set(prev).add(role.id));
    setFocusId(role.id);
  };

  const duplicate = (i: number) => {
    const src = roles[i];
    const copy: ProjectRole = { ...src, id: emptyRole().id, name: src.name ? `${src.name} (bản sao)` : '' };
    const next = [...roles];
    next.splice(i + 1, 0, copy);
    onChange(next);
    setOpen(prev => new Set(prev).add(copy.id));
    setFocusId(copy.id);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= roles.length) return;
    const next = [...roles];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const remove = (r: ProjectRole) => {
    if (hasContent(r) && !window.confirm(`Xoá vai "${r.name || 'chưa đặt tên'}"?`)) return;
    onChange(roles.filter(x => x.id !== r.id));
  };

  const addBulk = () => {
    const names = (bulk || '')
      .split('\n')
      .map(s => s.replace(/^[\s\-•*\d.)]+/, '').trim())
      .filter(Boolean)
      .slice(0, 50);
    if (!names.length) return setBulk(null);
    // Bỏ vai trống chưa điền gì (VD: vai mặc định khi tạo dự án)
    const kept = roles.filter(hasContent);
    const added = names.map(n => emptyRole(n));
    onChange([...kept, ...added]);
    setOpen(prev => {
      const next = new Set(prev);
      added.forEach(r => next.delete(r.id));
      return next;
    });
    setBulk(null);
  };

  const allOpen = roles.length > 0 && roles.every(r => open.has(r.id));

  return (
    <section className="bg-card rounded-2xl border p-5 sm:p-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <h3 className="font-bold text-sm">Vai cần tuyển ({roles.length})</h3>
        <div className="flex items-center gap-1.5">
          {roles.length > 1 && (
            <button
              type="button"
              onClick={() => setOpen(allOpen ? new Set() : new Set(roles.map(r => r.id)))}
              className="h-8 px-3 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {allOpen ? 'Thu gọn tất cả' : 'Mở tất cả'}
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => setBulk(bulk === null ? '' : null)}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border text-xs font-semibold hover:bg-muted"
            >
              <ListPlus className="w-3.5 h-3.5" /> Thêm nhanh nhiều vai
            </button>
          )}
        </div>
      </div>

      {bulk !== null && (
        <div className="p-4 rounded-xl border bg-muted/30 space-y-2">
          <label className={labelCls}>Mỗi dòng một tên vai</label>
          <textarea
            autoFocus
            rows={6}
            className={`${inputCls} resize-y leading-relaxed`}
            placeholder={'Chàng trai 1\nChàng trai 2\nCô gái số 1\nNgười mẹ\n…'}
            value={bulk}
            onChange={e => setBulk(e.target.value)}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">Sau khi thêm, bấm vào từng vai để điền giới tính, độ tuổi, mô tả.</p>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={() => setBulk(null)} className="h-9 px-3 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted">
                Huỷ
              </button>
              <button
                type="button"
                onClick={addBulk}
                disabled={!bulk.trim()}
                className="h-9 px-4 rounded-lg bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold disabled:opacity-40"
              >
                Thêm {bulk.split('\n').filter(s => s.trim()).length || ''} vai
              </button>
            </div>
          </div>
        </div>
      )}

      {roles.length === 0 && bulk === null && <p className="text-xs text-muted-foreground py-2">Chưa có vai nào.</p>}

      <ol className="space-y-2">
        {roles.map((r, i) => {
          const expanded = open.has(r.id);
          return (
            <li key={r.id} className={`rounded-xl border transition-colors ${expanded ? 'bg-muted/30' : 'bg-background hover:bg-muted/30'}`}>
              {/* Dòng tóm tắt: bấm để mở / thu gọn */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button type="button" onClick={() => toggle(r.id)} className="flex flex-1 min-w-0 items-center gap-3 text-left" aria-expanded={expanded}>
                  <span className="w-7 h-7 shrink-0 rounded-full bg-muted text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-semibold ${r.name.trim() ? '' : 'text-muted-foreground italic font-normal'}`}>
                      {r.name.trim() || 'Vai chưa đặt tên'}
                      {r.hidden && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 align-middle text-[10px] font-semibold text-amber-800">
                          <EyeOff className="w-3 h-3" /> Ẩn trên web
                        </span>
                      )}
                    </span>
                    {!expanded && <span className="block truncate text-[11px] text-muted-foreground">{roleSummaryLine(r)}</span>}
                  </span>
                  <ChevronDown className={`w-4 h-4 shrink-0 ml-auto text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
                {canEdit && (
                  <div className="flex items-center shrink-0">
                    <IconBtn title="Lên trên" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp className="w-3.5 h-3.5" />
                    </IconBtn>
                    <IconBtn title="Xuống dưới" disabled={i === roles.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown className="w-3.5 h-3.5" />
                    </IconBtn>
                    <IconBtn title={r.hidden ? 'Đang ẩn trên web. Bấm để hiện lại' : 'Ẩn vai trên web (vẫn giữ trong CRM và link NSX)'} onClick={() => setRole(r.id, { hidden: !r.hidden })}>
                      {r.hidden ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5" />}
                    </IconBtn>
                    <IconBtn title="Nhân bản vai" onClick={() => duplicate(i)}>
                      <Copy className="w-3.5 h-3.5" />
                    </IconBtn>
                    <IconBtn title="Xoá vai" danger onClick={() => remove(r)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </IconBtn>
                  </div>
                )}
              </div>

              {expanded && (
                <div className="px-3 pb-3.5 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,2fr)_140px_120px_70px_70px_80px] gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className={labelCls}>Tên vai *</label>
                      <input
                        ref={el => {
                          if (el) nameRefs.current.set(r.id, el);
                          else nameRefs.current.delete(r.id);
                        }}
                        className={inputCls}
                        placeholder="VD: Nữ chính – Linh"
                        value={r.name}
                        disabled={!canEdit}
                        onChange={e => setRole(r.id, { name: e.target.value })}
                        onKeyDown={e => {
                          // Enter ở vai cuối: thêm vai tiếp theo
                          if (e.key === 'Enter' && canEdit) {
                            e.preventDefault();
                            if (i === roles.length - 1) add();
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Loại vai</label>
                      <select className={inputCls} value={r.tier || ''} disabled={!canEdit} onChange={e => setRole(r.id, { tier: (e.target.value || null) as RoleTier | null })}>
                        <option value="">Chưa chọn</option>
                        {ROLE_TIERS.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Giới tính</label>
                      <select className={inputCls} value={r.gender} disabled={!canEdit} onChange={e => setRole(r.id, { gender: e.target.value as RoleGender })}>
                        <option value="any">Nam / Nữ</option>
                        <option value="female">Nữ</option>
                        <option value="male">Nam</option>
                      </select>
                    </div>
                    <NumberField label="Tuổi từ" value={r.age_min} disabled={!canEdit} onChange={v => setRole(r.id, { age_min: v })} />
                    <NumberField label="Đến" value={r.age_max} disabled={!canEdit} onChange={v => setRole(r.id, { age_max: v })} />
                    <NumberField label="Số lượng" value={r.quantity} disabled={!canEdit} onChange={v => setRole(r.id, { quantity: v })} />
                  </div>
                  <div>
                    <label className={labelCls}>Mô tả vai</label>
                    <textarea
                      rows={3}
                      className={`${inputCls} resize-y leading-relaxed`}
                      placeholder="Tính cách, ngoại hình, kỹ năng cần có…"
                      value={r.description || ''}
                      disabled={!canEdit}
                      onChange={e => setRole(r.id, { description: e.target.value })}
                    />
                  </div>
                  <RoleImagesField images={r.images || []} disabled={!canEdit} onChange={images => setRole(r.id, { images })} />
                  <SelftapeRequestsField requests={r.selftape_requests || []} disabled={!canEdit} onChange={selftape_requests => setRole(r.id, { selftape_requests })} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {canEdit && (
        <button
          type="button"
          onClick={() => add()}
          className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm font-semibold text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors"
        >
          <Plus className="w-4 h-4" /> Thêm vai
        </button>
      )}
    </section>
  );
}

function IconBtn({ title, onClick, disabled, danger, children }: { title: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground disabled:opacity-30 disabled:pointer-events-none ${
        danger ? 'hover:bg-rose-50 hover:text-rose-600' : 'hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function NumberField({ label, value, disabled, onChange }: { label: string; value?: number | null; disabled: boolean; onChange: (v: number | null) => void }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        className={inputCls}
        inputMode="numeric"
        value={value ?? ''}
        disabled={disabled}
        onChange={e => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
          onChange(digits ? Number(digits) : null);
        }}
      />
    </div>
  );
}

/** Ảnh tham khảo feel & look của vai (tối đa {ROLE_MAX_IMAGES} ảnh): hiện trên trang dự án, link NSX và ảnh xem trước khi chia sẻ link vai. */
function RoleImagesField({ images, onChange, disabled }: { images: string[]; onChange: (images: string[]) => void; disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');
    setBusy(true);
    const next = [...images];
    try {
      for (const f of Array.from(files).slice(0, ROLE_MAX_IMAGES - next.length)) next.push(await uploadPublicImage(f, 'role'));
      onChange(next);
    } catch (e) {
      if (next.length > images.length) onChange(next);
      setError(e instanceof Error ? e.message : 'Không tải được ảnh lên.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };
  return (
    <div>
      <label className={labelCls}>Ảnh tham khảo (feel &amp; look) · tối đa {ROLE_MAX_IMAGES} ảnh</label>
      <div className="flex flex-wrap gap-2">
        {images.map((u, i) => (
          <div key={u} className="relative h-24 w-[72px] overflow-hidden rounded-lg border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                aria-label="Xoá ảnh"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {!disabled && images.length < ROLE_MAX_IMAGES && (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-24 w-[72px] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-[11px] font-semibold text-muted-foreground hover:border-foreground/40 hover:text-foreground"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {busy ? 'Đang tải' : 'Thêm ảnh'}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => add(e.target.files)} />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** Yêu cầu self-tape của vai: mỗi yêu cầu có tên, mô tả chuẩn (chữ + ảnh + link, Markdown), bắt buộc hay không. */
function SelftapeRequestsField({ requests, onChange, disabled }: { requests: SelftapeRequest[]; onChange: (v: SelftapeRequest[]) => void; disabled: boolean }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLTextAreaElement>());
  const set = (id: string, patch: Partial<SelftapeRequest>) => onChange(requests.map(q => (q.id === id ? { ...q, ...patch } : q)));
  const add = () => onChange([...requests, { id: crypto.randomUUID().slice(0, 8), title: '', brief: '', required: true }]);
  const remove = (q: SelftapeRequest) => {
    if ((q.title || q.brief) && !window.confirm(`Xoá yêu cầu self-tape "${q.title || 'chưa đặt tên'}"?`)) return;
    onChange(requests.filter(x => x.id !== q.id));
  };
  const move = (i: number, d: number) => {
    const next = [...requests];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  /** Chèn đoạn chữ vào vị trí con trỏ trong ô mô tả */
  const insert = (q: SelftapeRequest, text: string) => {
    const el = refs.current.get(q.id);
    const pos = el ? el.selectionStart : q.brief.length;
    set(q.id, { brief: q.brief.slice(0, pos) + text + q.brief.slice(pos) });
  };
  const uploadImage = async (q: SelftapeRequest, file: File) => {
    setUploading(q.id);
    try {
      const url = await uploadPublicImage(file, 'role');
      insert(q, `\n\n![${file.name.replace(/\.[^.]+$/, '')}](${url})\n\n`);
    } catch (e) {
      window.alert((e as Error).message || 'Không tải được ảnh.');
    } finally {
      setUploading(null);
    }
  };
  return (
    <div className="rounded-xl border bg-background p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className={labelCls + ' !mb-0'}>Yêu cầu self-tape ({requests.length})</p>
          <p className="text-[11px] text-muted-foreground">Mỗi yêu cầu diễn viên nộp 1 link. Mô tả hiện trên trang vai và lúc ứng tuyển / chỉnh sửa hồ sơ ứng tuyển.</p>
        </div>
        {!disabled && requests.length < MAX_SELFTAPE_REQUESTS && (
          <button type="button" onClick={add} className="h-8 shrink-0 inline-flex items-center gap-1.5 px-3 rounded-lg border text-xs font-semibold hover:bg-muted">
            <Plus className="w-3.5 h-3.5" /> Thêm yêu cầu
          </button>
        )}
      </div>
      {requests.map((q, i) => (
        <div key={q.id} className="rounded-lg border p-3 space-y-2 bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 shrink-0 rounded-full bg-muted text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
            <input
              className={inputCls}
              placeholder="VD: Self-tape 1 – Giới thiệu bản thân"
              value={q.title}
              disabled={disabled}
              onChange={e => set(q.id, { title: e.target.value })}
            />
            <label className="flex shrink-0 items-center gap-1.5 text-xs font-semibold">
              <input type="checkbox" checked={q.required} disabled={disabled} onChange={e => set(q.id, { required: e.target.checked })} className="h-4 w-4 accent-black" /> Bắt buộc
            </label>
            {!disabled && (
              <div className="flex shrink-0">
                <IconBtn title="Lên trên" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="w-3.5 h-3.5" />
                </IconBtn>
                <IconBtn title="Xuống dưới" disabled={i === requests.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="w-3.5 h-3.5" />
                </IconBtn>
                <IconBtn title="Xoá yêu cầu" danger onClick={() => remove(q)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </IconBtn>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">Mô tả yêu cầu chuẩn: khung hình, ánh sáng, lời thoại… Chèn được ảnh và link.</span>
            <div className="flex shrink-0 items-center gap-1">
              {!disabled && (
                <>
                  <button
                    type="button"
                    title="Chèn link"
                    onClick={() => {
                      const url = window.prompt('Dán link (https://…)');
                      if (url) insert(q, `[${window.prompt('Chữ hiển thị của link', 'Xem tại đây') || 'Xem tại đây'}](${url.trim()})`);
                    }}
                    className="h-7 px-2 inline-flex items-center gap-1 rounded-md text-[11px] font-semibold text-muted-foreground hover:bg-muted"
                  >
                    <Link2 className="w-3.5 h-3.5" /> Link
                  </button>
                  <label className="h-7 px-2 inline-flex cursor-pointer items-center gap-1 rounded-md text-[11px] font-semibold text-muted-foreground hover:bg-muted">
                    {uploading === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />} Ảnh
                    <input type="file" accept="image/*" className="sr-only" onChange={e => e.target.files?.[0] && uploadImage(q, e.target.files[0])} />
                  </label>
                </>
              )}
              <button
                type="button"
                onClick={() => setPreview(p => (p === q.id ? null : q.id))}
                className="h-7 px-2 inline-flex items-center rounded-md text-[11px] font-semibold text-muted-foreground hover:bg-muted"
              >
                {preview === q.id ? 'Soạn' : 'Xem trước'}
              </button>
            </div>
          </div>
          {preview === q.id ? (
            <div className="rounded-lg border bg-white p-4 text-sm">{q.brief.trim() ? <AcademyMarkdown content={q.brief} /> : <p className="text-muted-foreground">Chưa có mô tả.</p>}</div>
          ) : (
            <textarea
              ref={el => {
                if (el) refs.current.set(q.id, el);
                else refs.current.delete(q.id);
              }}
              rows={4}
              className={`${inputCls} resize-y leading-relaxed`}
              placeholder={'VD: Quay ngang, ngang tầm mắt, ánh sáng trước mặt.\nĐọc đoạn thoại cảnh 12 (đính kèm link kịch bản).\nThời lượng tối đa 2 phút.'}
              value={q.brief}
              disabled={disabled}
              onChange={e => set(q.id, { brief: e.target.value })}
            />
          )}
        </div>
      ))}
    </div>
  );
}
