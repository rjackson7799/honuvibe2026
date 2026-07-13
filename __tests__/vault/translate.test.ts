import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildVaultTranslatePrompt,
  translateVaultContentToJp,
  vaultTranslateInputSchema,
  vaultTranslationResultSchema,
} from '@/lib/vault/translate';

// All authoring provider traffic goes through global fetch — stub it so these
// tests are fully deterministic and never hit the network (mirrors
// __tests__/workbench/authoring.test.ts).
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

// --- Fixtures ----------------------------------------------------------------

const coreInput = {
  title_en: 'Getting Started with Cursor IDE',
  description_en: 'A hands-on intro to the Cursor IDE.',
  body_en: null,
};

const bodyInput = {
  title_en: null,
  description_en: null,
  body_en: '# Intro\n\nSome markdown body.\n\n```js\nconsole.log(1);\n```',
};

const validCoreReply = JSON.stringify({
  title_jp: 'Cursor IDEの始め方',
  description_jp: 'Cursor IDEの実践的な入門です。',
  body_jp: null,
});

const validBodyReply = JSON.stringify({
  title_jp: null,
  description_jp: null,
  body_jp: '# はじめに\n\n本文です。\n\n```js\nconsole.log(1);\n```',
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

function requestBody(callIndex = 0): {
  temperature: number;
  max_tokens: number;
  system: string;
  messages: Array<{ role: string; content: string }>;
} {
  return JSON.parse(
    (fetchMock.mock.calls[callIndex][1] as RequestInit).body as string,
  );
}

// --- Prompt construction -----------------------------------------------------

describe('buildVaultTranslatePrompt', () => {
  it('embeds the EN fields as JSON and the JP tone rules', () => {
    const { system, userContent } = buildVaultTranslatePrompt(coreInput);

    expect(userContent).toContain('Getting Started with Cursor IDE');
    expect(system).toContain('です/ます');
    expect(system).toContain('katakana');
    expect(system).toContain('no markdown fences');
  });

  it('carries the 500-char cap, markdown-preservation, and null-passthrough rules', () => {
    const { system } = buildVaultTranslatePrompt(bodyInput);

    expect(system).toContain('under 500 characters');
    expect(system).toContain('preserve the Markdown structure exactly');
    expect(system).toContain('code blocks untranslated');
    expect(system).toContain('For any input field that is null, output null');
  });
});

// --- Schemas -------------------------------------------------------------------

describe('vault translate schemas', () => {
  it('accepts core-only and body-only inputs', () => {
    expect(vaultTranslateInputSchema.safeParse(coreInput).success).toBe(true);
    expect(vaultTranslateInputSchema.safeParse(bodyInput).success).toBe(true);
  });

  it('rejects an all-null input', () => {
    expect(
      vaultTranslateInputSchema.safeParse({
        title_en: null,
        description_en: null,
        body_en: null,
      }).success,
    ).toBe(false);
  });

  it('rejects empty strings after trim', () => {
    expect(
      vaultTranslateInputSchema.safeParse({ ...coreInput, title_en: '   ' })
        .success,
    ).toBe(false);
  });

  it('accepts null result fields and rejects an over-500-char description', () => {
    expect(
      vaultTranslationResultSchema.safeParse(JSON.parse(validBodyReply)).success,
    ).toBe(true);
    expect(
      vaultTranslationResultSchema.safeParse({
        title_jp: null,
        description_jp: 'あ'.repeat(501),
        body_jp: null,
      }).success,
    ).toBe(false);
  });
});

// --- Happy paths + call parameters ---------------------------------------------

describe('translateVaultContentToJp', () => {
  it('parses a valid core reply with translate temperature and small token cap', async () => {
    fetchMock.mockResolvedValue(anthropicReply(validCoreReply));

    const result = await translateVaultContentToJp(coreInput);
    expect(result.title_jp).toBe('Cursor IDEの始め方');
    expect(result.body_jp).toBeNull();

    const body = requestBody();
    expect(body.temperature).toBe(0.2);
    expect(body.max_tokens).toBe(2000);
  });

  it('raises the token cap for article-body translations', async () => {
    fetchMock.mockResolvedValue(anthropicReply(validBodyReply));

    const result = await translateVaultContentToJp(bodyInput);
    expect(result.body_jp).toContain('# はじめに');
    expect(requestBody().max_tokens).toBe(16000);
  });

  it('retries once on a parse failure with a corrective message, then succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(anthropicReply('I cannot produce that.'))
      .mockResolvedValueOnce(anthropicReply(validCoreReply));

    const result = await translateVaultContentToJp(coreInput);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.title_jp).toBe('Cursor IDEの始め方');

    const secondBody = requestBody(1);
    expect(secondBody.messages).toHaveLength(3);
    expect(secondBody.messages[2].content).toContain('could not be parsed as JSON');
  });
});

// --- Failures --------------------------------------------------------------------

describe('translateVaultContentToJp — failures', () => {
  it('throws SCHEMA_ERROR on a shape violation without retrying', async () => {
    fetchMock.mockResolvedValue(
      anthropicReply(JSON.stringify({ title_jp: 'タイトル' })),
    );

    await expect(translateVaultContentToJp(coreInput)).rejects.toMatchObject({
      name: 'AuthoringError',
      code: 'SCHEMA_ERROR',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws CONFIG_ERROR when the API key is unset, before any fetch', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    await expect(translateVaultContentToJp(coreInput)).rejects.toMatchObject({
      name: 'AuthoringError',
      code: 'CONFIG_ERROR',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws PROVIDER_ERROR on a non-2xx provider response', async () => {
    fetchMock.mockResolvedValue(anthropicReply('upstream boom', false, 500));

    await expect(translateVaultContentToJp(coreInput)).rejects.toMatchObject({
      name: 'AuthoringError',
      code: 'PROVIDER_ERROR',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
