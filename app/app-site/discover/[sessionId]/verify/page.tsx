import type { Metadata } from 'next';
import { OtpVerify } from '@/components/discover/OtpVerify';

export const metadata: Metadata = { title: 'Confirm your email' };

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <OtpVerify sessionId={sessionId} />;
}
