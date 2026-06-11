import type { Metadata } from 'next';
import { SummaryScreen } from '@/components/discover/SummaryScreen';

export const metadata: Metadata = { title: 'Your plan' };

export default async function CompletePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <SummaryScreen sessionId={sessionId} />;
}
