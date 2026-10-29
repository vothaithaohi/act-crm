'use client';

import { useParams } from 'next/navigation';
import { useCRM } from '@/lib/store/crm-context';
import { TalentDetailScreen } from '@/components/talents/talent-detail-screen';

// Hồ sơ diễn viên theo username: admin.dienvienvn.com/<username>
export default function TalentByUsernamePage() {
  const params = useParams();
  const { talents, isLoading } = useCRM();
  const username = decodeURIComponent(String(params?.username || '')).toLowerCase();
  const talent = talents.find(t => (t.username || '').toLowerCase() === username);
  return <TalentDetailScreen talent={talent} isLoading={isLoading} />;
}
