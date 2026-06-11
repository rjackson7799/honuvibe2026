import type { Metadata } from 'next';
import { ReviewEdit } from '@/components/discover/ReviewEdit';

export const metadata: Metadata = { title: 'Review your plan' };

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <ReviewEdit sessionId={sessionId} />;
}
