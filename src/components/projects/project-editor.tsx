'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, ExternalLink, EyeOff, RefreshCw, Save, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  CastingProject,
  PROJECT_STATUS_DETAILS,
  PROJECT_TYPES,
  ProjectStatus,
  newShareToken,
  nextProjectCode,
  publicProjectName,
  SHARE_TOKEN_LENGTH,
  partnerProjectPath
} from '@/lib/projects/types';
import { producerLink, publicProjectLink, publicSiteBase, useProjects } from '@/lib/projects/use-projects';
import Link from 'next/link';
import { RolesEditor, emptyRole } from './roles-editor';
import { VN_CITIES, VN_PROVINCES, ABROAD } from '@/lib/dienvienvn/provinces';
import { useCRM } from '@/lib/store/crm-context';

export function Toggle({
  checked,
  onChange,
  label,
  desc
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-start justify-between gap-4 p-3.5 rounded-xl border bg-background hover:bg-muted/40 text-left transition-colors"
    >
      <span>
        <span className="block text-xs font-semibold text-foreground">{label}</span>
        {desc && <span className="block text-[11px] text-muted-foreground mt-0.5">{desc}</span>}
      </span>
      <span
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg border bg-background text-xs outline-none focus:border-brand-500';
const labelCls = 'block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1';


export function ProjectEditor({ initial, onSaved }: { initial?: CastingProject; onSaved?: () => void }) {
  const router = useRouter();
  const { can } = useCRM();
  const { projects, saveProject, deleteProject } = useProjects();
  const canEdit = can('talents:write');
  const isNew = !initial;

  const [p, setP] = useState<CastingProject>(
    () =>
      initial || {
        id: crypto.randomUUID(),
        code: '',
        title: '',
        hide_title: true,
        production_company: '',
        project_type: 'feature_film',
        description: '',
        location: '',
        shooting_time: '',
        compensation: '',
        deadline: '',
        roles: [emptyRole()],
        selftape_required: false,
        selftape_brief: '',
        status: 'draft',
        share_token: newShareToken(),
        hide_contacts: false
      }
  );
  const [saving, setSaving] = useState(false);

  const suggestedCode = useMemo(
    () => nextProjectCode(projects.filter(x => x.id !== p.id).map(x => x.code)),
    [projects, p.id]
  );
  const code = p.code.trim() || suggestedCode;

  const set = (patch: Partial<CastingProject>) => setP(prev => ({ ...prev, ...patch }));

  const handleSave = async () => {
    if (!p.title.trim()) return toast.error('Vui lòng nhập tên dự án / tên phim');
    if (!/^[A-Za-z0-9-]{2,20}$/.test(code)) return toast.error('Mã dự án chỉ gồm chữ, số và dấu gạch ngang (VD: DV-01)');
    const roles = p.roles.filter(r => r.name.trim());
    if (p.status === 'open' && roles.length === 0) return toast.error('Dự án đang casting cần ít nhất một vai');
    if (roles.some(r => r.age_min && r.age_max && Number(r.age_min) > Number(r.age_max))) {
      return toast.error('Độ tuổi "từ" phải nhỏ hơn hoặc bằng "đến"');
    }
    setSaving(true);
    const ok = await saveProject({
      ...p,
      code: code.toUpperCase(),
      title: p.title.trim(),
      production_company: p.production_company?.trim() || null,
      description: p.description?.trim() || null,
      location: p.location || null,
      shooting_time: p.shooting_time?.trim() || null,
      compensation: p.compensation?.trim() || null,
      deadline: p.deadline || null,
      selftape_brief: p.selftape_brief?.trim() || null,
      roles: roles.map(r => ({
        ...r,
        name: r.name.trim(),
        description: r.description?.trim() || '',
        age_min: r.age_min ? Number(r.age_min) : null,
        age_max: r.age_max ? Number(r.age_max) : null,
        quantity: r.quantity ? Number(r.quantity) : null
      }))
    });
    setSaving(false);
    if (ok) {
      toast.success(isNew ? 'Đã tạo dự án' : 'Đã lưu dự án');
      onSaved?.();
      if (isNew) router.push(`/projects/${p.id}`);
    }
  };

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(msg);
    } catch {
      toast.info(text);
    }
  };

  const nsxLink = producerLink(p);
  const partnerLink = `${publicSiteBase()}/doi-tac/du-an/${partnerProjectPath(p) || p.id}`;

  return (
    <div className="space-y-5">
      {/* Thông tin dự án */}
      <section className="bg-card rounded-2xl border p-5 sm:p-6 space-y-4">
        <h3 className="font-bold text-sm border-b pb-3">Thông tin dự án</h3>

        <div className="grid grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)] gap-4">
          <div>
            <label className={labelCls}>Mã dự án</label>
            <div className="flex gap-1.5">
              <input
                className={`${inputCls} font-mono uppercase`}
                placeholder={suggestedCode}
                value={p.code}
                disabled={!canEdit}
                onChange={e => set({ code: e.target.value.toUpperCase() })}
              />
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => set({ code: suggestedCode })}
                title="Tự tạo mã"
                className="px-2.5 rounded-lg border hover:bg-muted text-muted-foreground"
              >
                <Wand2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Để trống sẽ tự tạo: {suggestedCode}</p>
          </div>
          <div>
            <label className={labelCls}>Tên dự án / Tên phim *</label>
            <input className={inputCls} placeholder="VD: Mai 2" value={p.title} disabled={!canEdit} onChange={e => set({ title: e.target.value })} />
          </div>
        </div>

        <Toggle
          checked={p.hide_title}
          onChange={v => canEdit && set({ hide_title: v })}
          label="Ẩn tên thật trên dienvienvn.com"
          desc={`Diễn viên sẽ thấy: “${publicProjectName({ hide_title: p.hide_title, code, title: p.title || 'Tên dự án' })}”. Tên thật và công ty sản xuất chỉ hiện trong CRM và trên link gửi NSX.`}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Công ty sản xuất</label>
            <input className={inputCls} value={p.production_company || ''} disabled={!canEdit} onChange={e => set({ production_company: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Loại dự án</label>
            <select className={inputCls} value={p.project_type} disabled={!canEdit} onChange={e => set({ project_type: e.target.value })}>
              {PROJECT_TYPES.map(t => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Trạng thái</label>
            <select className={inputCls} value={p.status} disabled={!canEdit} onChange={e => set({ status: e.target.value as ProjectStatus })}>
              {(Object.keys(PROJECT_STATUS_DETAILS) as ProjectStatus[]).map(s => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_DETAILS[s].label}
                  {s === 'open' ? ' (hiện trên web)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Địa điểm quay</label>
            <select className={inputCls} value={p.location || ''} disabled={!canEdit} onChange={e => set({ location: e.target.value })}>
              <option value="">Chưa xác định</option>
              <optgroup label="Thành phố trực thuộc trung ương">
                {VN_CITIES.map(c => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Tỉnh">
                {VN_PROVINCES.map(c => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
              <option value={ABROAD}>{ABROAD}</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Thời gian quay</label>
            <input className={inputCls} placeholder="VD: Tháng 12/2026" value={p.shooting_time || ''} disabled={!canEdit} onChange={e => set({ shooting_time: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Thù lao</label>
            <input className={inputCls} placeholder="VD: Thỏa thuận" value={p.compensation || ''} disabled={!canEdit} onChange={e => set({ compensation: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Hạn nộp hồ sơ</label>
            <input type="date" className={inputCls} value={p.deadline || ''} disabled={!canEdit} onChange={e => set({ deadline: e.target.value })} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Mô tả dự án (hiện công khai)</label>
          <textarea
            rows={4}
            className={`${inputCls} resize-y`}
            placeholder="Thể loại, nội dung chính, yêu cầu chung… (không nêu tên thật nếu đang ẩn tên)"
            value={p.description || ''}
            disabled={!canEdit}
            onChange={e => set({ description: e.target.value })}
          />
        </div>
      </section>

      {/* Vai cần tuyển */}
      <RolesEditor roles={p.roles} onChange={roles => set({ roles })} canEdit={canEdit} />

      {/* Self-tape & link NSX */}
      <section className="bg-card rounded-2xl border p-5 sm:p-6 space-y-4">
        <h3 className="font-bold text-sm border-b pb-3">Self-tape & Link gửi nhà sản xuất</h3>
        <Toggle
          checked={p.selftape_required}
          onChange={v => canEdit && set({ selftape_required: v })}
          label="NSX bắt buộc self-tape"
          desc={p.selftape_required ? 'Bật: diễn viên phải gửi link self-tape mới nộp được.' : 'Tắt: ô self-tape là tuỳ chọn.'}
        />
        <div>
          <label className={labelCls}>Hướng dẫn self-tape (hiện cho diễn viên)</label>
          <textarea
            rows={2}
            className={`${inputCls} resize-y`}
            placeholder="VD: Quay ngang, đọc đoạn thoại đính kèm, giới thiệu bản thân 30 giây…"
            value={p.selftape_brief || ''}
            disabled={!canEdit}
            onChange={e => set({ selftape_brief: e.target.value })}
          />
        </div>
        <Toggle
          checked={p.hide_contacts}
          onChange={v => canEdit && set({ hide_contacts: v })}
          label="Ẩn SĐT / Email trên link NSX"
          desc={p.hide_contacts ? 'NSX không thấy thông tin liên hệ của diễn viên.' : 'NSX thấy SĐT và email của diễn viên.'}
        />

        <div className="p-3.5 rounded-xl border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold">Link gửi NSX</span>
            <span className="text-[10px] text-muted-foreground">Chỉ hiện hồ sơ đã duyệt · {isNew ? 'dùng được sau khi lưu' : 'tự cập nhật'}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input readOnly value={nsxLink} className={`${inputCls} font-mono text-[11px]`} onFocus={e => e.target.select()} />
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={() => copy(nsxLink, 'Đã sao chép link NSX')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold">
                <Copy className="w-3.5 h-3.5" /> Sao chép
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Tạo link mới? Link cũ sẽ ngừng hoạt động sau khi bạn bấm Lưu.')) set({ share_token: newShareToken() });
                  }}
                  title="Thu hồi link cũ"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold hover:bg-muted"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Link mới
                </button>
              )}
            </div>
          </div>
          {p.share_token.length > SHARE_TOKEN_LENGTH && (
            <p className="text-[10px] text-muted-foreground">Bấm &ldquo;Link mới&rdquo; rồi Lưu để có link ngắn hơn (mã 6 ký tự). Link cũ sẽ ngừng hoạt động.</p>
          )}
        </div>

        <div className="p-3.5 rounded-xl border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold">Link cho đối tác có tài khoản</span>
            <span className="text-[10px] text-muted-foreground">Không có mã · cần đăng nhập</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input readOnly value={partnerLink} className={`${inputCls} font-mono text-[11px]`} onFocus={e => e.target.select()} />
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={() => copy(partnerLink, 'Đã sao chép link đối tác')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold hover:bg-muted">
                <Copy className="w-3.5 h-3.5" /> Sao chép
              </button>
              <Link href="/admin/partners" className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold hover:bg-muted">
                Gắn đối tác
              </Link>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Chỉ đối tác được gắn vào dự án này (mục Tài khoản đối tác) mới xem được. Đối tác thấy ứng viên đã duyệt kèm SĐT, email.
          </p>
        </div>
      </section>

      {/* Hành động */}
      {canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!isNew && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm(`Xoá dự án ${initial?.code}? Toàn bộ đơn ứng tuyển của dự án cũng bị xoá.`)) {
                    await deleteProject(p.id);
                    router.push('/projects');
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xoá dự án
              </button>
            )}
            {!isNew && p.status !== 'draft' && (
              <a href={publicProjectLink(p)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold hover:bg-muted">
                <ExternalLink className="w-3.5 h-3.5" /> Xem trang công khai
              </a>
            )}
            {p.hide_title && (
              <span className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
                <EyeOff className="w-3.5 h-3.5" /> Đang ẩn tên thật
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1d1d1f] hover:bg-black text-white text-xs font-bold shadow-md disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {saving ? 'Đang lưu…' : isNew ? 'Tạo dự án' : 'Lưu thay đổi'}
          </button>
        </div>
      )}
    </div>
  );
}
