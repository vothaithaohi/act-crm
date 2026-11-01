// Khách mời showcase (chỉ dùng nội bộ CRM): đạo diễn, nhà sản xuất, giảng viên… được mời
// làm khách mời / giám khảo các buổi showcase của học viên ACT.

export type InvitationStatus =
  | 'not_contacted'
  | 'contacting'
  | 'waiting'
  | 'confirmed'
  | 'success'
  | 'busy'
  | 'rejected'
  | 'failed'
  | 'skipped';

export interface ShowcaseGuest {
  id: string;
  full_name: string;
  call_name: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
  bio: string | null;
  photo_url: string | null;
  talkativity: number | null;
  judge_notes: string | null;
  contact_future: boolean | null;
  suitable_for: string[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShowcaseInvitation {
  id: string;
  guest_id: string;
  term: string;
  class_code: string | null;
  session: string | null;
  status: InvitationStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShowcaseGuestReview {
  id: string;
  guest_id: string;
  reviewer: string;
  rating: number | null;
  term: string | null;
  content: string;
  created_by?: string | null;
  created_at: string;
}

export const INVITATION_STATUS: Record<InvitationStatus, { label: string; badge: string; order: number }> = {
  success: { label: 'Đã tham dự', badge: 'bg-emerald-600 text-white border-emerald-600', order: 0 },
  confirmed: { label: 'Đã nhận lời', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', order: 1 },
  waiting: { label: 'Chờ phản hồi', badge: 'bg-amber-50 text-amber-800 border-amber-200', order: 2 },
  contacting: { label: 'Đang liên hệ', badge: 'bg-sky-50 text-sky-700 border-sky-200', order: 3 },
  not_contacted: { label: 'Chưa liên hệ', badge: 'bg-muted text-muted-foreground border-border', order: 4 },
  busy: { label: 'Bận', badge: 'bg-slate-100 text-slate-700 border-slate-200', order: 5 },
  rejected: { label: 'Từ chối', badge: 'bg-rose-50 text-rose-700 border-rose-200', order: 6 },
  failed: { label: 'Không đến', badge: 'bg-orange-50 text-orange-700 border-orange-200', order: 7 },
  skipped: { label: 'Không mời', badge: 'bg-muted text-muted-foreground border-border', order: 8 }
};

export const INVITATION_STATUS_LIST = (Object.keys(INVITATION_STATUS) as InvitationStatus[]).sort(
  (a, b) => INVITATION_STATUS[a].order - INVITATION_STATUS[b].order
);

/** Người nhận xét hay dùng (gõ tên khác vẫn được). */
export const REVIEWER_PRESETS = ['Kathy Uyên', 'Team office ACT'];

export const SUITABLE_FOR_PRESETS = ['Khách mời showcase', 'Giám khảo', 'Workshop', 'ACT1', 'ACT2', 'ACT3', 'ACT4'];

export const LOCAL_GUESTS_KEY = 'act_crm_showcase_guests_v1';
export const LOCAL_INVITATIONS_KEY = 'act_crm_showcase_invitations_v1';
export const LOCAL_GUEST_REVIEWS_KEY = 'act_crm_showcase_guest_reviews_v1';

/** Trạng thái trong file Excel cũ → trạng thái chuẩn (không nhận ra thì giữ chữ gốc ở ghi chú). */
export function parseInvitationStatus(raw: string): { status: InvitationStatus; note: string | null } {
  const v = raw.trim();
  const k = v.toLowerCase();
  if (!v) return { status: 'not_contacted', note: null };
  if (k === 'not contacted') return { status: 'not_contacted', note: null };
  if (k === 'contacting' || k === 'contacted') return { status: 'contacting', note: null };
  if (k === 'waiting') return { status: 'waiting', note: null };
  if (k === 'confirmed') return { status: 'confirmed', note: null };
  if (k === 'success') return { status: 'success', note: null };
  if (k === 'busy') return { status: 'busy', note: null };
  if (k === 'rejected' || k === 'denied') return { status: 'rejected', note: null };
  if (k === 'failed') return { status: 'failed', note: null };
  if (k === 'x' || /^k(o|hông|h[oô]ng)\s*m/i.test(v)) return { status: 'skipped', note: null };
  return { status: 'contacting', note: v };
}

/** Thống kê nhanh cho 1 khách mời. */
export function guestStats(invitations: ShowcaseInvitation[]) {
  const attended = invitations.filter(i => i.status === 'success').length;
  const confirmed = invitations.filter(i => i.status === 'confirmed').length;
  const declined = invitations.filter(i => i.status === 'rejected' || i.status === 'failed').length;
  const terms = Array.from(new Set(invitations.filter(i => i.status === 'success' || i.status === 'confirmed').map(i => i.term)));
  return { attended, confirmed, declined, terms };
}

/** Sắp xếp Term mới nhất trước: "TERM 36" > "TERM 8". */
export function termNumber(term: string): number {
  const m = /(\d+)/.exec(term);
  return m ? Number(m[1]) : -1;
}

export function foldVi(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}
