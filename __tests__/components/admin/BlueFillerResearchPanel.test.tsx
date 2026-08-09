import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BlueFillerResearchPanel } from '@/components/admin/BlueFillerResearchPanel';
import type { BlueFillerIdea } from '@/lib/blue-filler/types';

const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

// react-markdown is ESM-heavy and irrelevant here; the panel only needs to render.
vi.mock('@/lib/community/markdown', () => ({
  CommunityMarkdown: ({ body }: { body: string }) => <div data-testid="markdown">{body}</div>,
}));

const IDEA = { id: 'idea-1', status: 'new' } as unknown as BlueFillerIdea;

const GENERATING = { id: 'r-1', status: 'generating', search_count: 0, citations: null };
const COMPLETED = {
  id: 'r-1',
  status: 'completed',
  search_count: 9,
  citations: [{ url: 'https://a.example', title: 'A', cited_text: 'q' }],
  summary_md: '## Market reality',
  model_id: 'claude-opus-5+claude-sonnet-5',
  pipeline_version: 'bf-pipeline-v1',
  generation_error: null,
};

const fetchMock = vi.fn();

function respond(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as unknown as Response;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  refreshMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('BlueFillerResearchPanel', () => {
  it('polls every 5s while the latest run is generating', async () => {
    fetchMock.mockResolvedValue(respond({ latest: GENERATING, history: [GENERATING] }));

    render(<BlueFillerResearchPanel idea={IDEA} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await advance(5000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('?poll=1');

    await advance(5000);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await advance(5000);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('stops polling once the run reaches a terminal status, and refreshes the page data', async () => {
    fetchMock
      .mockResolvedValueOnce(respond({ latest: GENERATING, history: [GENERATING] }))
      .mockResolvedValueOnce(respond({ latest: COMPLETED }))
      .mockResolvedValue(respond({ latest: COMPLETED, history: [COMPLETED] }));

    render(<BlueFillerResearchPanel idea={IDEA} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await advance(5000); // poll -> completed, then one full reload
    const settled = fetchMock.mock.calls.length;
    expect(refreshMock).toHaveBeenCalled();

    // No further polling.
    await advance(20_000);
    expect(fetchMock).toHaveBeenCalledTimes(settled);
    expect(await screen.findByText(/9 searches/)).toBeTruthy();
  });

  it('clears the interval on unmount — no fetches after the component is gone', async () => {
    fetchMock.mockResolvedValue(respond({ latest: GENERATING, history: [GENERATING] }));

    const view = render(<BlueFillerResearchPanel idea={IDEA} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await advance(5000);
    const beforeUnmount = fetchMock.mock.calls.length;

    view.unmount();

    await advance(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(beforeUnmount);
  });

  it('stops polling on an error response without crashing', async () => {
    fetchMock
      .mockResolvedValueOnce(respond({ latest: GENERATING, history: [GENERATING] }))
      .mockResolvedValue(respond({ error: 'Not authorized' }, false, 403));

    render(<BlueFillerResearchPanel idea={IDEA} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await advance(5000);
    const settled = fetchMock.mock.calls.length;
    expect(await screen.findByText('Not authorized')).toBeTruthy();

    await advance(20_000);
    expect(fetchMock).toHaveBeenCalledTimes(settled);
  });

  it('keeps polling through a transient network blip', async () => {
    fetchMock
      .mockResolvedValueOnce(respond({ latest: GENERATING, history: [GENERATING] }))
      .mockRejectedValueOnce(new TypeError('network'))
      .mockResolvedValue(respond({ latest: GENERATING }));

    render(<BlueFillerResearchPanel idea={IDEA} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await advance(5000);
    await advance(5000);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('renders a terminal error with a human label, not the raw code', async () => {
    fetchMock.mockResolvedValue(
      respond({
        latest: { ...COMPLETED, status: 'partial', generation_error: 'no_citations' },
        history: [],
      }),
    );

    render(<BlueFillerResearchPanel idea={IDEA} />);
    expect(await screen.findByText(/found no citable sources/i)).toBeTruthy();
  });

  it('disables the run button for an archived idea', async () => {
    fetchMock.mockResolvedValue(respond({ latest: null, history: [] }));

    render(
      <BlueFillerResearchPanel idea={{ ...IDEA, status: 'archived' } as BlueFillerIdea} />,
    );

    const button = await screen.findByRole('button', { name: /run research/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(await screen.findByText(/un-archive it to run research/i)).toBeTruthy();
  });

  it('announces status changes politely', async () => {
    fetchMock.mockResolvedValue(respond({ latest: GENERATING, history: [GENERATING] }));
    const { container } = render(<BlueFillerResearchPanel idea={IDEA} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy();
  });
});
