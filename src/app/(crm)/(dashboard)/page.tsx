'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bot, BriefcaseBusiness, CalendarClock, CheckCircle2, ClipboardCheck, Handshake, PhoneCall, UserPlus, Webhook } from 'lucide-react';
import { useCRM } from '@/lib/store/crm-context';
import { formatPhoneNumber } from '@/lib/utils';
import { AIReportModal } from '@/components/ai/ai-report-modal';
import { LEAD_STATUS_DETAILS, LeadStatus, ROLE_DETAILS, UserRole, getReviewStatus } from '@/lib/types/crm';
import { talentPath } from '@/lib/talent-path';
import { useProjects } from '@/lib/projects/use-projects';
import { isDeadlinePassed } from '@/lib/projects/types';
import { useGuests } from '@/lib/guests/use-guests';
import { authedFetch } from '@/lib/supabase/authed-fetch';
import { createClient } from '@/lib/supabase/client';

const DAY = 86400000;
const withinDays = (iso: string | undefined | null, days: number) => !!iso && Date.now() - Date.parse(iso) <= days * DAY;
const thisMonth = (iso: string | undefined | null) => {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
};

const SOURCE_LABELS: Record<string, string> = { meta_ads: 'Meta Ads', website_form: 'Website', referral: 'Giới thiệu', manual: 'Nhập tay' };

/* ---------- Khối giao diện dùng chung ---------- */
function TodoCard({ icon: Icon, label, count, href, hint }: { icon: typeof ClipboardCheck; label: string; count: number | null; href: string; hint: string }) {
  const urgent = (count || 0) > 0;
  return (
    <Link
      href={href}
      className={`group p-5 rounded-2xl border shadow-xs flex items-start justify-between gap-3 transition-colors ${urgent ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800' : 'bg-card hover:bg-muted/40'}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="w-4 h-4" /> {label}
        </div>
        <div className={`mt-2 text-3xl font-extrabold ${urgent ? 'text-amber-800 dark:text-amber-300' : 'text-foreground'}`}>{count === null ? '…' : count}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
      </div>
      <ArrowRight className="w-4 h-4 mt-1 shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="p-5 bg-card rounded-2xl border shadow-xs">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-extrabold text-foreground">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Panel({ title, href, linkLabel = 'Xem tất cả', children }: { title: string; href?: string; linkLabel?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border p-6 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-3 border-b">
        <h3 className="font-bold text-base text-foreground">{title}</h3>
        {href && (
          <Link href={href} className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
            {linkLabel} <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="py-6 text-center text-xs text-muted-foreground">{children}</p>;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{children}</h2>;
}

/* ---------- Số đối tác / tin tuyển dụng chờ duyệt (chỉ Super Admin và Casting) ---------- */
function usePendingApprovals(enabled: boolean) {
  const [partners, setPartners] = useState<number | null>(null);
  const [crewJobs, setCrewJobs] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    authedFetch('/api/admin/partners', { cache: 'no-store' })
      .then(r => r.json())
      .then(b => setPartners(Array.isArray(b?.partners) ? b.partners.filter((p: { status: string }) => p.status === 'pending').length : 0))
      .catch(() => setPartners(0));
    const db = createClient();
    if (!db) return setCrewJobs(0);
    db.from('crew_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'draft')
      .then(({ count, error }) => setCrewJobs(error ? 0 : count || 0));
  }, [enabled]);
  return { partners, crewJobs };
}

/* ---------- Từng phần theo vai trò ---------- */
function LeadsList({ limit = 6 }: { limit?: number }) {
  const { leads } = useCRM();
  const list = [...leads].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, limit);
  return (
    <Panel title="Lead mới nhất" href="/leads">
      {list.length === 0 ? (
        <Empty>Chưa có lead nào.</Empty>
      ) : (
        <div className="divide-y divide-border/60">
          {list.map(l => (
            <div key={l.id} className="py-3 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <div className="font-bold text-foreground text-sm truncate">{l.full_name}</div>
                <div className="text-muted-foreground truncate">
                  {l.phone ? `${formatPhoneNumber(l.phone)} • ` : ''}
                  {SOURCE_LABELS[l.source] || l.source}
                </div>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full font-semibold text-[10px] ${LEAD_STATUS_DETAILS[l.status]?.badgeColor || 'bg-muted text-muted-foreground'}`}>
                {LEAD_STATUS_DETAILS[l.status]?.shortLabel || l.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/** todo=false: vai trò Chỉ xem — không có khối "Việc cần làm" (các việc duyệt không thuộc quyền của vai trò này). */
function CastingSections({ showLeads, todo = true }: { showLeads: boolean; todo?: boolean }) {
  const { talents, leads } = useCRM();
  const { projects, applications } = useProjects();
  const { partners, crewJobs } = usePendingApprovals(todo);

  const pendingTalents = talents.filter(t => getReviewStatus(t) === 'pending').length;
  const approved = talents.filter(t => getReviewStatus(t) === 'approved').length;
  const open = projects.filter(p => p.status === 'open' && !isDeadlinePassed(p.deadline));
  const newApps = applications.filter(a => withinDays(a.created_at, 7));
  const roles = open.reduce((n, p) => n + (p.roles?.length || 0), 0);
  const soon = open
    .filter(p => p.deadline && Date.parse(`${p.deadline}T23:59:59+07:00`) - Date.now() <= 7 * DAY)
    .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));
  const newTalents = talents
    .filter(t => t.submission_source === 'dienvienvn')
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 6);
  const appsByProject = (id: string) => newApps.filter(a => a.project_id === id).length;

  return (
    <>
      {todo && (
      <>
      <SectionTitle>Việc cần làm hôm nay</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TodoCard icon={ClipboardCheck} label="Hồ sơ chờ duyệt" count={pendingTalents} href="/talents" hint="Hồ sơ diễn viên từ dienvienvn.com" />
        <TodoCard icon={UserPlus} label="Ứng tuyển mới (7 ngày)" count={newApps.length} href="/projects" hint="Ứng viên mới của các dự án" />
        <TodoCard icon={Handshake} label="Đối tác chờ duyệt" count={partners} href="/admin/partners" hint="Tài khoản đối tác tự đăng ký" />
        <TodoCard icon={BriefcaseBusiness} label="Tin tuyển ekip chờ duyệt" count={crewJobs} href="/crew-jobs" hint="Tin đối tác gửi" />
      </div>
      </>
      )}

      <SectionTitle>Số liệu</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {showLeads ? (
          <>
            <Stat label="Lead mới (7 ngày)" value={leads.filter(l => withinDays(l.created_at, 7)).length} hint={`Tổng ${leads.length} lead`} />
            <Stat
              label="Tỷ lệ nhập học"
              value={`${leads.length ? ((leads.filter(l => l.status === 'converted').length / leads.length) * 100).toFixed(1) : '0'}%`}
              hint={`${leads.filter(l => l.status === 'converted').length} lead đã nhập học`}
            />
          </>
        ) : (
          <>
            <Stat label="Vai đang tuyển" value={roles} hint={`Trong ${open.length} dự án đang mở`} />
            <Stat label="Ứng tuyển mới (7 ngày)" value={newApps.length} hint={`Tổng ${applications.length} đơn ứng tuyển`} />
          </>
        )}
        <Stat label="Diễn viên đã duyệt" value={approved} hint={`Tổng ${talents.length} hồ sơ`} />
        <Stat label="Dự án đang casting" value={open.length} hint={showLeads ? `${roles} vai · ${newApps.length} ứng tuyển mới 7 ngày` : `${roles} vai đang tuyển`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Dự án sắp hết hạn nộp (7 ngày)" href="/projects">
          {soon.length === 0 ? (
            <Empty>Không có dự án nào sắp hết hạn.</Empty>
          ) : (
            <div className="divide-y divide-border/60">
              {soon.map(p => (
                <Link key={p.id} href={`/projects/${p.id}`} className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-muted/40 -mx-2 px-2 rounded-lg">
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">
                      <span className="font-mono text-[11px] mr-1.5 text-muted-foreground">{p.code}</span>
                      {p.title}
                    </div>
                    <div className="text-muted-foreground">
                      {p.roles?.length || 0} vai · {appsByProject(p.id)} ứng tuyển mới
                    </div>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 text-amber-700 font-semibold">
                    <CalendarClock className="w-3.5 h-3.5" /> {new Date(p.deadline as string).toLocaleDateString('vi-VN')}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
        {showLeads ? (
          <LeadsList />
        ) : (
          <Panel title="Diễn viên mới nộp hồ sơ" href="/talents">
            {newTalents.length === 0 ? (
              <Empty>Chưa có hồ sơ mới từ dienvienvn.com.</Empty>
            ) : (
              <div className="divide-y divide-border/60">
                {newTalents.map(t => (
                  <Link key={t.id} href={talentPath(t)} className="py-2.5 flex items-center gap-3 text-xs hover:bg-muted/40 -mx-2 px-2 rounded-lg">
                    <div className="w-9 h-11 rounded-md overflow-hidden bg-muted shrink-0 border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {t.headshot_url && <img src={t.headshot_url} alt="" className="w-full h-full object-cover object-top" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm truncate">{t.full_name}</div>
                      <div className="text-muted-foreground">{t.created_at ? new Date(t.created_at).toLocaleDateString('vi-VN') : ''}</div>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                      {getReviewStatus(t) === 'pending' ? 'Chờ duyệt' : getReviewStatus(t) === 'approved' ? 'Đã duyệt' : 'Chưa duyệt'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}

function SalesSections() {
  const { leads } = useCRM();
  const intake = leads.filter(l => l.status === 'intake').length;
  const callBack = leads.filter(l => l.status === 'follow_up_later').length;
  const month = leads.filter(l => thisMonth(l.created_at));
  const monthConverted = month.filter(l => l.status === 'converted').length;
  const statuses = Object.keys(LEAD_STATUS_DETAILS) as LeadStatus[];
  return (
    <>
      <SectionTitle>Việc cần làm hôm nay</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TodoCard icon={UserPlus} label="Lead mới chưa liên hệ" count={intake} href="/leads" hint="Trạng thái Tiếp nhận" />
        <TodoCard icon={PhoneCall} label="Lead cần gọi lại" count={callBack} href="/leads" hint="Trạng thái Chăm sóc sau" />
      </div>
      <SectionTitle>Số liệu</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Lead tháng này" value={month.length} hint={`Tổng ${leads.length} lead`} />
        <Stat label="Chuyển đổi tháng này" value={`${month.length ? ((monthConverted / month.length) * 100).toFixed(1) : '0'}%`} hint={`${monthConverted} lead nhập học`} />
        <div className="col-span-2 p-5 bg-card rounded-2xl border shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead theo trạng thái</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {statuses.map(s => (
              <span key={s} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${LEAD_STATUS_DETAILS[s].badgeColor}`}>
                {LEAD_STATUS_DETAILS[s].shortLabel}: {leads.filter(l => l.status === s).length}
              </span>
            ))}
          </div>
        </div>
      </div>
      <LeadsList limit={8} />
    </>
  );
}

function MarketingSections() {
  const { leads, talents } = useCRM();
  const { guests, invitations } = useGuests();
  const weekLeads = leads.filter(l => withinDays(l.created_at, 7)).length;
  const prevWeek = leads.filter(l => withinDays(l.created_at, 14) && !withinDays(l.created_at, 7)).length;
  const webTalents = talents.filter(t => t.submission_source === 'dienvienvn' && withinDays(t.created_at, 7)).length;
  const bySource = Object.entries(
    leads.reduce<Record<string, number>>((m, l) => ({ ...m, [l.source]: (m[l.source] || 0) + 1 }), {})
  ).sort((a, b) => b[1] - a[1]);
  const confirmed = invitations.filter(i => i.status === 'confirmed').length;
  const waiting = invitations.filter(i => i.status === 'waiting').length;
  return (
    <>
      <SectionTitle>Số liệu</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Lead mới tuần này" value={weekLeads} hint={`Tuần trước: ${prevWeek}`} />
        <Stat label="Hồ sơ diễn viên mới từ web" value={webTalents} hint="7 ngày qua, từ dienvienvn.com" />
        <div className="col-span-2 p-5 bg-card rounded-2xl border shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead theo nguồn</div>
          <div className="mt-3 space-y-2">
            {bySource.length === 0 ? (
              <p className="text-xs text-muted-foreground">Chưa có lead.</p>
            ) : (
              bySource.map(([src, n]) => (
                <div key={src} className="flex items-center gap-3 text-xs">
                  <span className="w-24 shrink-0 font-semibold">{SOURCE_LABELS[src] || src}</span>
                  <span className="h-2 rounded-full bg-[#1d1d1f] dark:bg-white" style={{ width: `${Math.max(4, (n / leads.length) * 100)}%` }} />
                  <span className="text-muted-foreground">{n}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <Panel title="Khách mời showcase" href="/guests">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-extrabold">{guests.length}</div>
            <div className="text-[11px] text-muted-foreground">Khách mời</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-600">{confirmed}</div>
            <div className="text-[11px] text-muted-foreground">Lời mời đã nhận lời</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-amber-600">{waiting}</div>
            <div className="text-[11px] text-muted-foreground">Chờ phản hồi</div>
          </div>
        </div>
      </Panel>
      <LeadsList />
    </>
  );
}

function DeveloperSections() {
  const { webhookLogs, leads, talents } = useCRM();
  const failed = webhookLogs.filter(l => l.status === 'failed').length;
  const last = webhookLogs[0];
  return (
    <>
      <SectionTitle>Số liệu</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Webhook Meta" value={last ? (last.status === 'success' ? 'Hoạt động' : 'Lỗi') : '—'} hint={last ? `Lần cuối ${new Date(last.created_at).toLocaleString('vi-VN')}` : 'Chưa nhận sự kiện nào'} />
        <Stat label="Sự kiện lỗi" value={failed} hint={`Trên ${webhookLogs.length} sự kiện`} />
        <Stat label="Lead" value={leads.length} />
        <Stat label="Hồ sơ diễn viên" value={talents.length} />
      </div>
      <Panel title="Nhật ký webhook gần nhất" href="/admin/webhooks">
        {webhookLogs.length === 0 ? (
          <Empty>Chưa có nhật ký webhook.</Empty>
        ) : (
          <div className="divide-y divide-border/60">
            {webhookLogs.slice(0, 8).map(l => (
              <div key={l.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    <Webhook className="inline w-3.5 h-3.5 mr-1 -translate-y-px" />
                    {l.event} · {l.source}
                  </div>
                  <div className="text-muted-foreground">{new Date(l.created_at).toLocaleString('vi-VN')}</div>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${l.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {l.status === 'success' ? 'Thành công' : 'Lỗi'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}

/** Trang tổng quan CRM: hiện việc cần làm, số liệu và danh sách theo vai trò của người đăng nhập. */
export default function DashboardOverviewPage() {
  const { leads, talents, currentUser, viewAsRole } = useCRM();
  const [isAiReportOpen, setIsAiReportOpen] = useState(false);
  const [aiReportType, setAiReportType] = useState<'ads_optimization' | 'finance'>('ads_optimization');
  // Super Admin đang "xem với vai trò…" → trang tổng quan của vai trò đó
  const role = (viewAsRole || currentUser?.role || 'developer') as UserRole;
  const showAi = role === 'super_admin' || role === 'marketing';

  const sections = useMemo(() => {
    if (role === 'super_admin') return <CastingSections showLeads />;
    if (role === 'casting') return <CastingSections showLeads={false} />;
    if (role === 'sales') return <SalesSections />;
    if (role === 'marketing') return <MarketingSections />;
    if (role === 'viewer') return <CastingSections showLeads todo={false} />;
    return <DeveloperSections />;
  }, [role]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chào {currentUser?.full_name?.split(' ').slice(-1)[0] || 'bạn'}.</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentUser?.full_name || ''}
            {currentUser?.department ? ` · ${currentUser.department}` : ''}
            <span className={`ml-2 inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border ${ROLE_DETAILS[role]?.badge || ''}`}>{ROLE_DETAILS[role]?.label || role}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="w-4 h-4" /> {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
        </div>
      </div>

      {sections}

      {showAi && (
        <div className="p-6 rounded-3xl border border-white/10 act-hero text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#d4ae6a]" />
              <span className="font-extrabold text-base tracking-tight text-white">Báo Cáo AI Claude (Growth &amp; Finance Intelligence)</span>
            </div>
            <p className="text-xs text-neutral-300">
              Khai phá dữ liệu {leads.length} lead và {talents.length} diễn viên ACT Academy để xuất báo cáo tối ưu hoá và tài chính.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setAiReportType('ads_optimization');
                setIsAiReportOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl act-gold-bg text-black font-bold text-xs shadow-md shadow-[#a87b3f]/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              🤖 Claude: Phân tích Tối ưu Ads
            </button>
            <button
              onClick={() => {
                setAiReportType('finance');
                setIsAiReportOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              📊 Claude: Báo cáo Tài chính Lead
            </button>
          </div>
        </div>
      )}

      {showAi && <AIReportModal isOpen={isAiReportOpen} onClose={() => setIsAiReportOpen(false)} initialType={aiReportType} />}
    </div>
  );
}
