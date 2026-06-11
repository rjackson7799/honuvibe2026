import type { Metadata } from 'next';
import { IntakeGate } from '@/components/discover/IntakeGate';

export const metadata: Metadata = {
  title: 'Start a project',
};

export default function DiscoverIntakePage() {
  return <IntakeGate />;
}
