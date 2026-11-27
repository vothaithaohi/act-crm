import { RecapDetail } from '@/components/recap/recap-detail';

export default async function RecapMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  return <RecapDetail id={(await params).id} />;
}
