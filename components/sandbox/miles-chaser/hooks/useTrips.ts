// Ported from MilesChaser src/hooks/useTrips.ts — fetcher swapped to the
// demo store; segment mutations (addSegment/updateSegment/deleteSegment)
// pruned (no fetch in the demo tree; the ported pages don't use them).
import useSWR, { mutate } from 'swr';
import { getStore } from '@/lib/sandbox/miles-chaser/store';
import type { Trip, TripSegment } from '@/lib/sandbox/miles-chaser/types/database';

export type TripWithSegments = Trip & {
  trip_segments: TripSegment[];
};

export interface TripFilters {
  status?: string;
  enrollment_id?: string;
  is_earning_flight?: boolean;
  limit?: number;
  offset?: number;
  sort?: string;
}

const fetcher = <Data,>(path: string): Promise<Data> => getStore().read(path) as Promise<Data>;

function buildTripsUrl(filters?: TripFilters) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.enrollment_id) params.set('enrollment_id', filters.enrollment_id);
  if (filters?.is_earning_flight !== undefined) params.set('is_earning_flight', String(filters.is_earning_flight));
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.offset) params.set('offset', String(filters.offset));
  if (filters?.sort) params.set('sort', filters.sort);
  const qs = params.toString();
  return `/api/trips${qs ? `?${qs}` : ''}`;
}

export function useTrips(filters?: TripFilters) {
  const url = buildTripsUrl(filters);
  const { data, error, isLoading } = useSWR<{
    data: TripWithSegments[];
    pagination: { limit: number; offset: number; total: number };
  }>(url, fetcher);

  return {
    trips: data?.data || [],
    pagination: data?.pagination || { limit: 20, offset: 0, total: 0 },
    error,
    isLoading,
  };
}

export function useTrip(id: string | null) {
  const { data, error, isLoading } = useSWR<{ data: TripWithSegments }>(
    id ? `/api/trips/${id}` : null,
    fetcher
  );

  return {
    trip: data?.data || null,
    error,
    isLoading,
  };
}

export async function createTrip(input: Record<string, unknown>) {
  const trip = await getStore().createTrip(input);
  // Revalidate all trip list queries and projections
  await mutate((key: string) => typeof key === 'string' && key.startsWith('/api/trips'));
  await mutate((key: string) => typeof key === 'string' && key.startsWith('/api/projection'));
  return trip as TripWithSegments;
}

export async function updateTrip(id: string, input: Record<string, unknown>) {
  const trip = await getStore().updateTrip(id, input);
  await mutate((key: string) => typeof key === 'string' && key.startsWith('/api/trips'));
  await mutate((key: string) => typeof key === 'string' && key.startsWith('/api/projection'));
  return trip as TripWithSegments;
}

export async function deleteTrip(id: string) {
  await getStore().deleteTrip(id);
  await mutate((key: string) => typeof key === 'string' && key.startsWith('/api/trips'));
  await mutate((key: string) => typeof key === 'string' && key.startsWith('/api/projection'));
}
