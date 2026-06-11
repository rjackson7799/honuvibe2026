import type { Metadata } from 'next';
import { DiscoverFlowProvider } from '@/components/discover/DiscoverFlowProvider';
import { DiscoverFlow } from '@/components/discover/DiscoverFlow';

export const metadata: Metadata = {
  title: 'Your project',
};

export default async function DiscoverFlowPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <DiscoverFlowProvider sessionId={sessionId}>
      <DiscoverFlow />
    </DiscoverFlowProvider>
  );
}
