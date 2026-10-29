import type { TalentProfile } from '@/lib/types/crm';

/** Đường dẫn hồ sơ trong CRM: /<username> (VD: admin.dienvienvn.com/phamthaikhuong), dự phòng /talents/<id>. */
export function talentPath(t: Pick<TalentProfile, 'id'> & { username?: string | null }): string {
  return t.username ? `/${t.username}` : `/talents/${t.id}`;
}
