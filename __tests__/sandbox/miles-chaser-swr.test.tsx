import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';
import { useTrips, createTrip } from '@/components/sandbox/miles-chaser/hooks/useTrips';
import { useProjection } from '@/components/sandbox/miles-chaser/hooks/useProjection';
import { getStore } from '@/lib/sandbox/miles-chaser/store';
import { MOCK_ENROLLMENT_ID, mockTrips } from '@/lib/sandbox/miles-chaser/mock-data';

// NOTE: hooks use the getStore() singleton (default latency) — reset it per
// test. The wrapper must NOT override the SWR cache provider: the mutation
// helpers broadcast through the global `mutate`, which only reaches the
// default cache — exactly how the real demo pages consume these hooks.
const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ dedupingInterval: 0 }}>{children}</SWRConfig>
);

describe('SWR hooks ↔ store revalidation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    getStore().reset();
  });

  it('createTrip revalidates the trip list AND the projection', async () => {
    const trips = renderHook(() => useTrips(), { wrapper });
    const projection = renderHook(() => useProjection(MOCK_ENROLLMENT_ID), { wrapper });
    await waitFor(() => expect(trips.result.current.trips).toHaveLength(mockTrips.length));
    await waitFor(() => expect(projection.result.current.projection).toBeTruthy());
    const qmBefore = projection.result.current.projection!.projectedQM;

    await act(() => createTrip({
      enrollment_id: MOCK_ENROLLMENT_ID, status: 'planned',
      is_earning_flight: true, notes: 'Hook Hop',
      segments: [{
        origin: 'SEA', destination: 'HNL', departure_date: '2031-08-01',
        airline_code: 'AS', fare_class: 'M', is_partner_flight: false,
        estimated_qualifying_miles: 1000, estimated_qualifying_segments: 1,
        estimated_qualifying_dollars: 100,
      }],
    }));

    await waitFor(() => expect(trips.result.current.trips).toHaveLength(mockTrips.length + 1));
    await waitFor(() =>
      expect(projection.result.current.projection!.projectedQM).toBe(qmBefore + 1000),
    );
  });
});
