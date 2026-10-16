'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCRM } from '@/lib/store/crm-context';
import { TalentDetailScreen } from '@/components/talents/talent-detail-screen';

export default function TalentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getTalentById, isLoading } = useCRM();

  const talentId = params?.id as string;
  const talent = getTalentById(talentId);

  // Link cũ /talents/<id> → đường dẫn mới /<username>
  useEffect(() => {
    if (talent?.username) router.replace(`/${talent.username}${typeof window !== 'undefined' ? window.location.hash : ''}`);
  }, [talent?.username, router]);

  return <TalentDetailScreen talent={talent} isLoading={isLoading} />;
}
