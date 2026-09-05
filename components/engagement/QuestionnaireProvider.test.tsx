// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACKOFF_MS,
  QuestionnaireProvider,
  TEXT_DEBOUNCE_MS,
  useQuestionnaire,
  type ClientQuestionnaire,
} from './QuestionnaireProvider';
import type { EngagementQuestion } from '@/lib/studio/engagement/questions-schema';

// Fake-timer pins on the autosave engine: five keystrokes → ONE POST; a choice
// click POSTs immediately; blur (flush) fires before the debounce; two rapid
// saves to one question serialize (and coalesce to the latest value); a
// failed save backs off 1s → 3s → 8s and then surfaces the manual Retry.

const about: EngagementQuestion = {
  id: 'about',
  section_key: 'orientation',
  qtype: 'text',
  prompt: 'About the business',
  help: null,
  required: true,
  options: [],
  allow_other: false,
  max_select: null,
  long: true,
};
const goal: EngagementQuestion = {
  id: 'goal',
  section_key: 'orientation',
  qtype: 'single',
  prompt: 'Main goal',
  help: null,
  required: false,
  options: [
    { value: 'leads', label: 'More leads' },
    { value: 'bookings', label: 'More bookings' },
  ],
  allow_other: true,
  max_select: null,
  long: false,
};

const questionnaire: ClientQuestionnaire = {
  id: '3f2a1c9e-0b7d-4e6a-9c1f-2d8b7a6e5f40',
  locale: 'en',
  title: 'Discovery',
  intro_md: null,
  sections: [{ key: 'orientation', title: 'Orientation', blurb: null }],
  questions: [about, goal],
  questions_version: 3,
  status: 'in_progress',
  submitted_at: null,
};

type Api = ReturnType<typeof useQuestionnaire>;
let api: Api | null = null;
function Probe() {
  api = useQuestionnaire();
  return null;
}

function mount() {
  render(
    <QuestionnaireProvider questionnaire={questionnaire} initialAnswers={[]}>
      <Probe />
    </QuestionnaireProvider>,
  );
}

function okResponse() {
  return { ok: true, status: 200, json: async () => ({ ok: true }) } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function bodyOf(call: unknown[]): { question_id: string; answer: unknown; questions_version: number } {
  return JSON.parse((call[1] as { body: string }).body);
}

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn(() => Promise.resolve(okResponse()));
  vi.stubGlobal('fetch', fetchMock);
  api = null;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('QuestionnaireProvider autosave', () => {
  it('five keystrokes on a text question produce ONE POST with the final value, carrying questions_version', async () => {
    mount();
    await act(async () => {
      for (const v of ['h', 'he', 'hel', 'hell', 'hello']) api!.setAnswer(about, v);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(api!.chip.kind).toBe('saving');
    await tick(TEXT_DEBOUNCE_MS - 1);
    expect(fetchMock).not.toHaveBeenCalled();
    await tick(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as unknown[];
    expect(url).toBe(`/api/engagement/${questionnaire.id}/answer`);
    expect(bodyOf(fetchMock.mock.calls[0] as unknown[])).toMatchObject({ question_id: 'about', answer: 'hello', questions_version: 3 });
    await tick(0);
    expect(api!.chip.kind).toBe('saved');
    expect(api!.saves.about.status).toBe('saved');
  });

  it('a choice click POSTs immediately (0 ms)', async () => {
    mount();
    await act(async () => {
      api!.setAnswer(goal, 'leads');
    });
    await tick(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(bodyOf(fetchMock.mock.calls[0] as unknown[])).toMatchObject({ question_id: 'goal', answer: 'leads' });
  });

  it('blur (flush) fires the pending text save before the debounce elapses', async () => {
    mount();
    await act(async () => {
      api!.setAnswer(about, 'typing');
    });
    await tick(100);
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      await api!.flush();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(bodyOf(fetchMock.mock.calls[0] as unknown[]).answer).toBe('typing');
    await tick(TEXT_DEBOUNCE_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1); // the debounce was cancelled, not doubled
  });

  it('two rapid saves to one question serialize: the second waits for the first and sends the LATEST value', async () => {
    let resolveFirst!: (r: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>((r) => (resolveFirst = r)));
    mount();
    await act(async () => {
      api!.setAnswer(about, 'a');
    });
    await tick(TEXT_DEBOUNCE_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1); // in flight, unresolved
    await act(async () => {
      api!.setAnswer(about, 'ab');
    });
    await act(async () => {
      api!.setAnswer(about, 'abc');
    });
    await tick(TEXT_DEBOUNCE_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1); // queued behind the first, not sent yet
    await act(async () => {
      resolveFirst(okResponse());
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(bodyOf(fetchMock.mock.calls[1] as unknown[]).answer).toBe('abc'); // coalesced: 'ab' was never sent
    await tick(0);
    expect(api!.saves.about.status).toBe('saved');
  });

  it('a failed save retries 1s → 3s → 8s, then surfaces Unsaved — retry; manual retry re-sends', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('network')));
    mount();
    await act(async () => {
      api!.setAnswer(about, 'x');
    });
    await tick(TEXT_DEBOUNCE_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(api!.chip.kind).toBe('saving'); // still retrying — never "Unsaved" until exhausted
    await tick(BACKOFF_MS[0]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await tick(BACKOFF_MS[1]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await tick(BACKOFF_MS[2]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    await tick(0);
    expect(api!.saves.about.status).toBe('failed');
    expect(api!.chip.kind).toBe('unsaved');
    await tick(20_000);
    expect(fetchMock).toHaveBeenCalledTimes(4); // holds — no infinite retry

    fetchMock.mockImplementation(() => Promise.resolve(okResponse()));
    await act(async () => {
      api!.retryFailed();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(api!.chip.kind).toBe('saved');
  });

  it('a 403 stops saving and shows the "open from your email again" state; a 409 stale_manifest is fatal too', async () => {
    fetchMock.mockImplementation(() => Promise.resolve({ ok: false, status: 403, json: async () => ({ error: 'forbidden' }) } as Response));
    mount();
    await act(async () => {
      api!.setAnswer(goal, 'leads');
    });
    await tick(0);
    expect(api!.fatal).toBe('forbidden');
    // Nothing more is sent once fatal.
    await act(async () => {
      api!.setAnswer(goal, 'bookings');
    });
    await tick(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('submit flushes pending saves and is blocked while any save is failed', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('network')));
    mount();
    await act(async () => {
      api!.setAnswer(about, 'x');
    });
    await tick(TEXT_DEBOUNCE_MS + BACKOFF_MS[0] + BACKOFF_MS[1] + BACKOFF_MS[2] + 10);
    expect(api!.saves.about.status).toBe('failed');
    const calls = fetchMock.mock.calls.length;
    await act(async () => {
      await api!.submit();
    });
    expect(api!.submitted).toBe(false);
    expect(api!.submitError).toBe(api!.t.unsavedBlock);
    // No submit POST was sent (only the retried answer saves, if any).
    const submitCalls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/submit'));
    expect(submitCalls).toHaveLength(0);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(calls);
  });

  it('submit right after answering flushes the saves and POSTs — never a false "unsaved" (stale-ref regression)', async () => {
    mount();
    await act(async () => {
      api!.setAnswer(about, 'A café');
      api!.setAnswer(goal, 'leads');
    });
    // No timers advanced: both saves are still pending when submit starts.
    await act(async () => {
      const p = api!.submit();
      await vi.advanceTimersByTimeAsync(TEXT_DEBOUNCE_MS + 50);
      await p;
    });
    const submitCalls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/submit'));
    expect(submitCalls).toHaveLength(1);
    expect(api!.submitError).toBeNull();
    expect(api!.submitted).toBe(true);
  });

  it('submit jumps to the first missing required question instead of posting', async () => {
    mount();
    await act(async () => {
      api!.setAnswer(goal, 'leads');
    });
    await tick(0);
    await act(async () => {
      await api!.submit();
    });
    expect(api!.missing).toEqual({ about: true });
    expect(api!.submitted).toBe(false);
    expect(fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/submit'))).toHaveLength(0);
  });

  it('a 409 not_open is a dead link unless the questionnaire is actually submitted (start-over race)', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 409, json: async () => ({ error: 'not_open', status: 'draft' }) } as Response),
    );
    mount();
    await act(async () => {
      api!.setAnswer(goal, 'leads');
    });
    await tick(0);
    expect(api!.submitted).toBe(false); // never a false thank-you for answers that were just cleared
    expect(api!.fatal).toBe('forbidden');
  });

  it('a 409 not_open with status submitted locks the page as submitted', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 409, json: async () => ({ error: 'not_open', status: 'submitted' }) } as Response),
    );
    mount();
    await act(async () => {
      api!.setAnswer(goal, 'leads');
    });
    await tick(0);
    expect(api!.submitted).toBe(true);
    expect(api!.fatal).toBeNull();
  });

  it('a 429 holds for Retry-After without burning the bounded retries, then re-sends the latest value once', async () => {
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '5' }),
        json: async () => ({ error: 'rate_limited' }),
      } as unknown as Response),
    );
    mount();
    await act(async () => {
      api!.setAnswer(goal, 'leads');
    });
    await tick(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(api!.saves.goal.status).toBe('dirty');
    expect(api!.chip.kind).not.toBe('unsaved');
    await tick(BACKOFF_MS[0]); // the 1 s backoff schedule does NOT apply to a hold
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await tick(5_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(api!.saves.goal.status).toBe('saved');
  });
});
