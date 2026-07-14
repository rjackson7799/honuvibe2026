// Ported from MilesChaser src/hooks/useMicroVacations.ts — fetcher swapped
// to the demo store; SWR keys and options kept verbatim.
import useSWR, { mutate } from 'swr';
import { getStore } from '@/lib/sandbox/miles-chaser/store';
import type { ScoredRoute } from '@/lib/sandbox/miles-chaser/types/domain';

export interface MicroVacationFilters {
  origin: string | null;
  enrollmentId: string | null;
  tag?: string;
  limit?: number;
}

export interface MicroVacationResponse {
  routes: ScoredRoute[];
  totalAvailable: number;
  isPremiumRequired: boolean;
  gap: { qm: number; qs: number; qd: number };
}

const fetcher = <Data,>(path: string): Promise<Data> => getStore().read(path) as Promise<Data>;

function buildUrl(filters: MicroVacationFilters): string | null {
  if (!filters.origin || !filters.enrollmentId) return null;
  const params = new URLSearchParams();
  params.set('origin', filters.origin);
  params.set('enrollment_id', filters.enrollmentId);
  if (filters.tag) params.set('tag', filters.tag);
  if (filters.limit) params.set('limit', String(filters.limit));
  return `/api/micro-vacations?${params.toString()}`;
}

export function useMicroVacations(filters: MicroVacationFilters) {
  const url = buildUrl(filters);
  const { data, error, isLoading } = useSWR<{ data: MicroVacationResponse }>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    recommendations: data?.data?.routes || [],
    totalAvailable: data?.data?.totalAvailable || 0,
    isPremiumRequired: data?.data?.isPremiumRequired || false,
    gap: data?.data?.gap || null,
    error,
    isLoading,
  };
}

export function revalidateMicroVacations() {
  return mutate(
    (key: string) =>
      typeof key === 'string' && key.startsWith('/api/micro-vacations')
  );
}
