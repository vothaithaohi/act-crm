// Tài khoản đối tác (đạo diễn, nhà sản xuất…) xem đầy đủ hồ sơ diễn viên đã duyệt tại dienvienvn.com/doi-tac.
import type { ProducerTalent } from '@/lib/projects/producer';
import type { TalentProfile } from '@/lib/types/crm';

export type PartnerType = 'director' | 'producer' | 'casting' | 'agency' | 'brand' | 'other';
export type PartnerStatus = 'active' | 'disabled';

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  director: 'Đạo diễn',
  producer: 'Nhà sản xuất',
  casting: 'Casting director',
  agency: 'Agency / Công ty quảng cáo',
  brand: 'Nhãn hàng',
  other: 'Đối tác khác'
};

export interface PartnerAccount {
  id: string;
  email: string;
  full_name: string;
  company: string | null;
  partner_type: PartnerType;
  status: PartnerStatus;
  note: string | null;
  auth_user_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
}

/** Hồ sơ đầy đủ cho đối tác: như link NSX (có SĐT, email; không có địa chỉ nhà, người giám hộ) + username, ca hát. */
export type PartnerTalent = ProducerTalent & {
  username: string | null;
  singing: TalentProfile['singing'] | null;
  preferred_project_types: string[];
  preferred_role_types: string[];
};

export const PARTNER_PORTAL_PATH = '/doi-tac';
