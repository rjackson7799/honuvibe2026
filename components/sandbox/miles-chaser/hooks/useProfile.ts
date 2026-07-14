// Ported from MilesChaser src/hooks/useProfile.ts — fetcher swapped to the
// demo store; updateProfile pruned (settings are excluded from the demo).
import useSWR from 'swr';
import { getStore } from '@/lib/sandbox/miles-chaser/store';
import type { Profile } from '@/lib/sandbox/miles-chaser/types/database';

const fetcher = <Data,>(path: string): Promise<Data> => getStore().read(path) as Promise<Data>;

export function useProfile() {
  const { data, error, isLoading } = useSWR<{ data: Profile }>(
    '/api/profile',
    fetcher
  );

  return {
    profile: data?.data ?? null,
    error,
    isLoading,
  };
}
