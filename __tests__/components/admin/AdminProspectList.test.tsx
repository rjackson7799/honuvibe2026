import { render, screen, fireEvent, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminProspectList } from '@/components/admin/AdminProspectList';

// The two poll behaviors the plan pins down: the interval dies with the
// component, and polling reads the UNFILTERED scoringCount — a status filter
// that hides 'scoring' rows must not stop it.

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function jsonRes(payload: unknown) {
  return { ok: true, status: 200, json: async () => payload };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn().mockResolvedValue(jsonRes({ prospects: [], scoringCount: 2 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('AdminProspectList polling', () => {
  it('polls the list GET every ~5s while scoringCount > 0', async () => {
    render(<AdminProspectList initialProspects={[]} initialScoringCount={2} />);
    expect(fetchMock).not.toHaveBeenCalled();

    await tick(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/admin/prospects');

    await tick(5000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps polling when the status filter hides scoring rows (reads scoringCount, not the rows)', async () => {
    render(<AdminProspectList initialProspects={[]} initialScoringCount={2} />);

    // Filter to Scored — the list no longer contains 'scoring' rows, but the
    // response's unfiltered scoringCount stays 2.
    fireEvent.click(screen.getByText('Scored'));
    await tick(300); // the filter-change debounce fetch
    const callsAfterFilter = fetchMock.mock.calls.length;
    expect(callsAfterFilter).toBeGreaterThanOrEqual(1);
    expect(String(fetchMock.mock.calls[callsAfterFilter - 1][0])).toContain('status=scored');

    await tick(5000); // next poll tick still fires
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFilter);
  });

  it('stops polling once scoringCount reaches 0', async () => {
    render(<AdminProspectList initialProspects={[]} initialScoringCount={1} />);

    fetchMock.mockResolvedValue(jsonRes({ prospects: [], scoringCount: 0 }));
    await tick(5000);
    const settled = fetchMock.mock.calls.length;
    expect(settled).toBeGreaterThanOrEqual(1);

    await tick(15000); // three more would-be ticks — none fire
    expect(fetchMock.mock.calls.length).toBe(settled);
  });

  it('stops polling on a definitive HTTP error (e.g. expired session)', async () => {
    render(<AdminProspectList initialProspects={[]} initialScoringCount={2} />);

    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Not authenticated' }),
    });
    await tick(5000);
    const settled = fetchMock.mock.calls.length;

    await tick(15000); // no endless 5s error loop
    expect(fetchMock.mock.calls.length).toBe(settled);
    expect(screen.getByText('Not authenticated')).toBeInTheDocument();
  });

  it('clears the poll interval on unmount', async () => {
    const { unmount } = render(<AdminProspectList initialProspects={[]} initialScoringCount={2} />);
    await tick(5000);
    const before = fetchMock.mock.calls.length;
    expect(before).toBeGreaterThanOrEqual(1);

    unmount();
    await tick(15000);
    expect(fetchMock.mock.calls.length).toBe(before);
  });
});
