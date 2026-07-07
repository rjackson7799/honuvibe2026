import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildDraftPrompt,
  buildTranslatePrompt,
  generateScenarioDraft,
  translateScenarioToJp,
  workbenchDraftResultSchema,
  workbenchTranslationResultSchema,
} from '@/lib/workbench/authoring';

// All authoring provider traffic goes through global fetch — stub it so these
// tests are fully deterministic and never hit the network (mirrors
// __tests__/workbench/evaluator.test.ts).
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

// --- Fixtures ----------------------------------------------------------------

const draftInput = {
  idea: 'cold outreach email for a dentist office',
  domain: 'marketing',
  difficulty: 'beginner',
} as const;

const translateInput = {
  title_en: 'Launch copy',
  brief_en: 'Write launch copy for a new app.',
  expert_prompt_en: 'You are a launch copywriter. Write the hero copy.',
  expert_output_en: 'Expert output.',
  why_this_works_en: 'It assigns a role and a concrete task.',
};

const validDraftBody = JSON.stringify({
  title_en: 'Dentist cold outreach',
  slug: 'dentist-cold-outreach',
  brief_en: 'You run marketing for a dental office.',
  expert_prompt_en: 'You are an outreach copywriter...',
  expert_output_en: 'Subject: A brighter smile...',
  why_this_works_en: 'It assigns a role, a bounded task, and a format.',
  applicable_dimensions: ['role', 'task', 'format'],
});

const validTranslationBody = JSON.stringify({
  title_jp: 'ローンチコピー',
  brief_jp: '新しいアプリのローンチコピーを書く。',
  expert_prompt_jp: 'あなたはローンチのコピーライターです。',
  expert_output_jp: 'お手本の出力。',
  why_this_works_jp: '役割と具体的なタスクを指定しているためです。',
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

// --- Prompt construction -----------------------------------------------------

describe('buildDraftPrompt', () => {
  it('carries the idea, domain, difficulty, and JSON-shape rules', () => {
    const { system, userContent } = buildDraftPrompt(draftInput);

    expect(userContent).toContain('cold outreach email for a dentist office');
    expect(userContent).toContain('marketing');
    expect(userContent).toContain('beginner');

    // Shape + discipline instructions live in the system prompt.
    expect(system).toContain('"applicable_dimensions"');
    expect(system).toContain('role, context, task, constraints, format, examples');
    expect(system).toContain('no markdown code fences');
    expect(system).toContain('must NOT hint at prompt-writing techniques');
  });
});

describe('buildTranslatePrompt', () => {
  it('embeds the EN fields as JSON and the JP-output rules', () => {
    const { system, userContent } = buildTranslatePrompt(translateInput);

    expect(userContent).toContain('Write launch copy for a new app.');
    expect(system).toContain('です/ます');
    expect(system).toContain('"expert_prompt_jp"');
    expect(system).toContain('no markdown fences');
  });
});

// --- Result schemas ----------------------------------------------------------

describe('result schemas', () => {
  it('accepts valid payloads', () => {
    expect(
      workbenchDraftResultSchema.safeParse(JSON.parse(validDraftBody)).success,
    ).toBe(true);
    expect(
      workbenchTranslationResultSchema.safeParse(JSON.parse(validTranslationBody))
        .success,
    ).toBe(true);
  });

  it('rejects a draft with a bad slug or unknown dimension', () => {
    const bad = JSON.parse(validDraftBody);
    expect(
      workbenchDraftResultSchema.safeParse({ ...bad, slug: 'Bad Slug' }).success,
    ).toBe(false);
    expect(
      workbenchDraftResultSchema.safeParse({
        ...bad,
        applicable_dimensions: ['tone'],
      }).success,
    ).toBe(false);
  });

  it('allows a null why_this_works_jp in translations', () => {
    const body = { ...JSON.parse(validTranslationBody), why_this_works_jp: null };
    expect(workbenchTranslationResultSchema.safeParse(body).success).toBe(true);
  });
});

// --- Happy paths -------------------------------------------------------------

describe('generateScenarioDraft', () => {
  it('parses a valid reply', async () => {
    fetchMock.mockResolvedValue(anthropicReply(validDraftBody));

    const result = await generateScenarioDraft(draftInput);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.slug).toBe('dentist-cold-outreach');
    expect(result.applicable_dimensions).toEqual(['role', 'task', 'format']);
  });

  it('recovers JSON wrapped in a code fence', async () => {
    fetchMock.mockResolvedValue(
      anthropicReply('```json\n' + validDraftBody + '\n```'),
    );

    const result = await generateScenarioDraft(draftInput);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.title_en).toBe('Dentist cold outreach');
  });
});

describe('translateScenarioToJp', () => {
  it('parses a valid reply and uses a low translation temperature', async () => {
    fetchMock.mockResolvedValue(anthropicReply(validTranslationBody));

    const result = await translateScenarioToJp(translateInput);
    expect(result.title_jp).toBe('ローンチコピー');

    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    ) as { temperature: number };
    expect(body.temperature).toBe(0.2);
  });
});

// --- JSON parse + one retry ----------------------------------------------------

describe('authoring — parse + retry', () => {
  it('retries once on a parse failure, then succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(anthropicReply('I cannot produce that.'))
      .mockResolvedValueOnce(anthropicReply(validDraftBody));

    const result = await generateScenarioDraft(draftInput);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.slug).toBe('dentist-cold-outreach');

    const secondBody = JSON.parse(
      (fetchMock.mock.calls[1][1] as RequestInit).body as string,
    ) as { messages: Array<{ role: string; content: string }> };
    expect(secondBody.messages).toHaveLength(3);
    expect(secondBody.messages[2].content).toContain('could not be parsed as JSON');
  });

  it('throws PARSE_ERROR after the retry also fails', async () => {
    fetchMock.mockResolvedValue(anthropicReply('still not json'));

    await expect(generateScenarioDraft(draftInput)).rejects.toMatchObject({
      name: 'AuthoringError',
      code: 'PARSE_ERROR',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// --- Schema / config / provider failures ---------------------------------------

describe('authoring — failures', () => {
  it('throws SCHEMA_ERROR on a shape violation without retrying', async () => {
    const missingSlug = JSON.stringify({
      ...JSON.parse(validDraftBody),
      slug: undefined,
    });
    fetchMock.mockResolvedValue(anthropicReply(missingSlug));

    await expect(generateScenarioDraft(draftInput)).rejects.toMatchObject({
      name: 'AuthoringError',
      code: 'SCHEMA_ERROR',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws CONFIG_ERROR when the API key is unset, before any fetch', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    await expect(translateScenarioToJp(translateInput)).rejects.toMatchObject({
      name: 'AuthoringError',
      code: 'CONFIG_ERROR',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws PROVIDER_ERROR on a non-2xx provider response', async () => {
    fetchMock.mockResolvedValue(anthropicReply('upstream boom', false, 500));

    await expect(generateScenarioDraft(draftInput)).rejects.toMatchObject({
      name: 'AuthoringError',
      code: 'PROVIDER_ERROR',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
