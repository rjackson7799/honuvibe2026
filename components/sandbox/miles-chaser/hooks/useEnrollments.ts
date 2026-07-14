// Ported from MilesChaser src/hooks/useEnrollments.ts — fetcher swapped to
// the demo store; enrollment mutations pruned (the demo has one fixed
// enrollment; no fetch in the demo tree).
import useSWR from 'swr';
import { getStore } from '@/lib/sandbox/miles-chaser/store';
import type { UserProgramEnrollment, LoyaltyProgram } from '@/lib/sandbox/miles-chaser/types/database';

export type EnrollmentWithProgram = UserProgramEnrollment & {
  loyalty_programs: LoyaltyProgram;
};

const fetcher = <Data,>(path: string): Promise<Data> => getStore().read(path) as Promise<Data>;

export function useEnrollments() {
  const { data, error, isLoading } = useSWR<{ data: EnrollmentWithProgram[] }>(
    '/api/enrollments',
    fetcher
  );

  return {
    enrollments: data?.data || [],
    error,
    isLoading,
  };
}

export function useEnrollment(id: string | null) {
  const { data, error, isLoading } = useSWR<{ data: EnrollmentWithProgram }>(
    id ? `/api/enrollments/${id}` : null,
    fetcher
  );

  return {
    enrollment: data?.data || null,
    error,
    isLoading,
  };
}
