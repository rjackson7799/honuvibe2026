// Ported from MilesChaser src/hooks/useProjection.ts — fetcher swapped to
// the demo store; SWR key and options kept verbatim.
import useSWR from 'swr';
import { getStore } from '@/lib/sandbox/miles-chaser/store';
import type { ProjectionResult } from '@/lib/sandbox/miles-chaser/types/domain';

const fetcher = <Data,>(path: string): Promise<Data> => getStore().read(path) as Promise<Data>;

export function useProjection(enrollmentId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ data: ProjectionResult }>(
    enrollmentId ? `/api/projection/${enrollmentId}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      keepPreviousData: true,
    }
  );

  return {
    projection: data?.data ?? null,
    error,
    isLoading,
    refresh: mutate,
  };
}
