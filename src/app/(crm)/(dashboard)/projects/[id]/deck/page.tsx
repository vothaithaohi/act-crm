'use client';

import { Suspense, use, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { ActorDeck, TapeLink } from '@/components/projects/actor-deck';
import { roleSelftapeRequests } from '@/lib/projects/types';
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
  const { talents, refreshTalents } = useCRM();
  const { projects, applications, refresh } = useProjects();
  const project = projects.find(p => p.id === id);
  const list = useMemo(() => {
    const byId = new Map(talents.map(t => [t.id, t]));
    return ids.map(i => byId.get(i)).filter((t): t is NonNullable<typeof t> => !!t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talents, ids.join(',')]);
  // Self-tape của từng diễn viên cho dự án này: theo tên yêu cầu của vai, rồi các self-tape gửi thêm
  const tapesOf = (talentId: string): TapeLink[] => {
    const out: TapeLink[] = [];
    for (const a of applications.filter(x => x.project_id === id && x.talent_id === talentId)) {
      const role = project?.roles.find(r => r.id === a.role_id);
      const reqs = roleSelftapeRequests(role);
      const items = a.selftape_items || [];
      for (const q of reqs) {
        const it = items.find(x => x.request_id === q.id && x.url);
        if (it) out.push({ label: q.title, url: it.url });
        else if (q.required) out.push({ label: q.title });
      }
      const used = new Set(items.map(x => x.url));
      const extras = Array.from(new Set([...(a.selftape_urls || []), a.selftape_url || ''].filter(u => u && !used.has(u))));
      extras.forEach((u, i) => out.push({ label: extras.length > 1 || reqs.length ? `Self-tape ${i + 1}` : 'Self-tape', url: u }));
    }
    return out;
  };
  return (
    <PermissionGuard permissions={['talents:read']} customTitle="Deck hồ sơ diễn viên">
      <ActorDeck
        talents={list}
        title={project?.title || 'Dự án'}
        onBack={() => router.push(`/projects/${id}`)}
        tapesOf={tapesOf}
        onRefresh={async () => {
          await Promise.all([refreshTalents(), refresh()]);
        }}
      />
    </PermissionGuard>
  );
}
