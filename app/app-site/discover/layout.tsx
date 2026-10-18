import { notFound } from 'next/navigation';
import { isDiscoveryEnabled } from '@/lib/discover/availability';

export default function DiscoveryAvailabilityLayout({ children }: { children: React.ReactNode }) {
  if (!isDiscoveryEnabled()) notFound();
  return children;
}
