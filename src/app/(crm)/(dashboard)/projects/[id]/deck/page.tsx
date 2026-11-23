'use client';

import { Suspense, use, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { ActorDeck } from '@/components/projects/actor-deck';
import { useCRM } from '@/lib/store/crm-context';
import { useProjects } from '@/lib/projects/use-projects';

/** Xuất deck hồ sơ diễn viên (mẫu Actor Profile) cho các ứng viên đã chọn của dự án. ?ids= mã hồ sơ, theo thứ tự. */
export default function ProjectDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <DeckInner id={id} />
    </Suspense>
  );
}

function DeckInner({ id }: { id: string }) {
  const router = useRouter();
  const ids = (useSearchParams().get('ids') || '').split(',').filter(Boolean);
  const { talents } = useCRM();
  const { projects } = useProjects();
  const project = projects.find(p => p.id === id);
  const list = useMemo(() => {
    const byId = new Map(talents.map(t => [t.id, t]));
    return ids.map(i => byId.get(i)).filter((t): t is NonNullable<typeof t> => !!t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talents, ids.join(',')]);
  return (
    <PermissionGuard permissions={['talents:read']} customTitle="Deck hồ sơ diễn viên">
      <ActorDeck talents={list} title={project?.title || 'Dự án'} onBack={() => router.push(`/projects/${id}`)} />
    </PermissionGuard>
  );
}
