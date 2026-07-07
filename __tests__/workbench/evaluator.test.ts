import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildEvaluatorPrompt,
  evaluateAttempt,
} from '@/lib/workbench/evaluator';
import { EVALUATOR_EXEMPLARS } from '@/lib/workbench/evaluator-exemplars';
import type {
  WorkbenchAttempt,
  WorkbenchScenario,
} from '@/lib/workbench/types';

// All evaluator provider traffic goes through global fetch — stub it so these
// tests are fully deterministic and never hit the network.
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

// --- Fixtures --------------------------------------------------------------

function makeScenario(
  overrides: Partial<WorkbenchScenario> = {},
): WorkbenchScenario {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'demo-scenario',
    title_en: 'Demo',
    title_jp: 'デモ',
    domain: 'marketing',
    difficulty: 'beginner',
    brief_en: 'Write launch copy for a new app.',
    brief_jp: '新しいアプリのローンチコピーを書く。',
    applicable_dimensions: ['role', 'task', 'format'],
    expert_prompt_en: 'You are a launch copywriter. Write the hero copy.',
    expert_prompt_jp: 'あなたはローンチのコピーライターです。ヒーローコピーを書いて。',
    expert_output_en: 'Expert output',
    expert_output_jp: 'お手本の出力',
    why_this_works_en: null,
    why_this_works_jp: null,
    is_published: true,
    is_featured: false,
    jp_needs_review: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const attemptEn: Pick<
  WorkbenchAttempt,
  'language' | 'prompt_text' | 'output_text'
> = {
  language: 'en',
  prompt_text: 'MARKER-PROMPT write some launch copy',
  output_text: 'MARKER-OUTPUT here is the launch copy',
};

// A valid evaluator reply for the role/task/format dimensions.
const validBody = JSON.stringify({
  role: { score: 5, rationale: 'Clear persona.', improvement: 'Keep it.' },
  task: { score: 2, rationale: 'Vague ask.', improvement: 'Specify the deliverable.' },
  format: { score: 4, rationale: 'Structure given.', improvement: 'Name the columns.' },
});

/** Build a fake Anthropic /v1/messages Response carrying `text`. */
function anthropicReply(text: string, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: async () => text,
    json: async () => ({ content: [{ type: 'text', text }] }),
  } as unknown as Response;
}

// --- Prompt construction ---------------------------------------------------

describe('buildEvaluatorPrompt', () => {
  it('includes each applicable dimension, EN exemplars, and the JSON-only rule', () => {
    const { system, userContent } = buildEvaluatorPrompt({
      scenario: makeScenario(),
      attempt: attemptEn,
    });

    // Every applicable dimension appears as a rubric header.
    expect(system).toContain('### role');
    expect(system).toContain('### task');
    expect(system).toContain('### format');

    // English exemplar text is injected for an EN attempt.
    expect(system).toContain(EVALUATOR_EXEMPLARS.role.en.strong.sample);
    expect(system).toContain(EVALUATOR_EXEMPLARS.task.en.weak.sample);

    // Language + JSON discipline instructions.
    expect(system).toContain('English');
    expect(system).toContain('no markdown code fences');

    // The user content carries the member's prompt + output and the brief.
    expect(userContent).toContain('MARKER-PROMPT write some launch copy');
    expect(userContent).toContain('MARKER-OUTPUT here is the launch copy');
    expect(userContent).toContain('Write launch copy for a new app.');
  });

  it('selects JP fields and JP exemplars for a Japanese attempt', () => {
    const { system, userContent } = buildEvaluatorPrompt({
      scenario: makeScenario(),
      attempt: { ...attemptEn, language: 'ja' },
    });

    expect(system).toContain(EVALUATOR_EXEMPLARS.role.ja.strong.sample);
    expect(system).toContain('Japanese');
    // JP brief, not the EN one.
    expect(userContent).toContain('新しいアプリのローンチコピーを書く。');
    expect(userContent).not.toContain('Write launch copy for a new app.');
  });
});

// --- Happy path + scoring math --------------------------------------------

describe('evaluateAttempt — scoring', () => {
  it('parses a valid reply and derives overall/strengths/improvements', async () => {
    fetchMock.mockResolvedValue(anthropicReply(validBody));

    const result = await evaluateAttempt({
      scenario: makeScenario(),
      attempt: attemptEn,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.scores).toEqual({ role: 5, task: 2, format: 4 });
    // mean(5,2,4) = 3.6667 * 20 = 73.33 -> 73
    expect(result.overallScore).toBe(73);
    // dims scoring >=4, highest first.
    expect(result.strengths).toEqual(['Clear persona.', 'Structure given.']);
    // dims with a gap, largest gap (lowest score) first; role (5) excluded.
    expect(result.improvements).toEqual([
      'Specify the deliverable.',
      'Name the columns.',
    ]);
    expect(result.dimensions.task?.rationale).toBe('Vague ask.');
  });
});

// --- Fence stripping -------------------------------------------------------

describe('evaluateAttempt — fence stripping', () => {
  it('parses JSON wrapped in a ```json code fence on the first call', async () => {
    fetchMock.mockResolvedValue(
      anthropicReply('```json\n' + validBody + '\n```'),
    );

    const result = await evaluateAttempt({
      scenario: makeScenario(),
      attempt: attemptEn,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.overallScore).toBe(73);
  });
});

// --- JSON parse + one retry ------------------------------------------------

describe('evaluateAttempt — parse + retry', () => {
  it('retries once on a parse failure, then succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(anthropicReply('I cannot produce that.'))
      .mockResolvedValueOnce(anthropicReply(validBody));

    const result = await evaluateAttempt({
      scenario: makeScenario(),
      attempt: attemptEn,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.overallScore).toBe(73);

    // The retry appends the parse error so the model can self-correct.
    const secondBody = JSON.parse(
      (fetchMock.mock.calls[1][1] as RequestInit).body as string,
    ) as { messages: Array<{ role: string; content: string }> };
    expect(secondBody.messages).toHaveLength(3);
    expect(secondBody.messages[2].content).toContain('could not be parsed as JSON');
  });

  it('throws PARSE_ERROR after the retry also fails to parse', async () => {
    fetchMock.mockResolvedValue(anthropicReply('still not json'));

    await expect(
      evaluateAttempt({ scenario: makeScenario(), attempt: attemptEn }),
    ).rejects.toMatchObject({ name: 'EvaluatorError', code: 'PARSE_ERROR' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// --- Schema validation -----------------------------------------------------

describe('evaluateAttempt — schema validation', () => {
  it('rejects an out-of-range score without retrying', async () => {
    const badScore = JSON.stringify({
      role: { score: 9, rationale: 'x', improvement: 'y' },
      task: { score: 2, rationale: 'x', improvement: 'y' },
      format: { score: 4, rationale: 'x', improvement: 'y' },
    });
    fetchMock.mockResolvedValue(anthropicReply(badScore));

    await expect(
      evaluateAttempt({ scenario: makeScenario(), attempt: attemptEn }),
    ).rejects.toMatchObject({ name: 'EvaluatorError', code: 'SCHEMA_ERROR' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects when an applicable dimension is missing', async () => {
    const missingFormat = JSON.stringify({
      role: { score: 5, rationale: 'x', improvement: 'y' },
      task: { score: 2, rationale: 'x', improvement: 'y' },
    });
    fetchMock.mockResolvedValue(anthropicReply(missingFormat));

    await expect(
      evaluateAttempt({ scenario: makeScenario(), attempt: attemptEn }),
    ).rejects.toMatchObject({ name: 'EvaluatorError', code: 'SCHEMA_ERROR' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// --- Config / provider failures (map to the route's 502 path) --------------

describe('evaluateAttempt — config + provider errors', () => {
  it('throws CONFIG_ERROR when the API key is unset, before any fetch', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    await expect(
      evaluateAttempt({ scenario: makeScenario(), attempt: attemptEn }),
    ).rejects.toMatchObject({ name: 'EvaluatorError', code: 'CONFIG_ERROR' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws PROVIDER_ERROR on a non-2xx provider response', async () => {
    fetchMock.mockResolvedValue(anthropicReply('upstream boom', false, 500));

    await expect(
      evaluateAttempt({ scenario: makeScenario(), attempt: attemptEn }),
    ).rejects.toMatchObject({ name: 'EvaluatorError', code: 'PROVIDER_ERROR' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
