import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  appendAssistantTurn,
  buildPhase1Request,
  countSearches,
  extractText,
  harvestCitations,
  normalizeUrl,
  Phase1Error,
  runPhase1,
  USABLE_FINDINGS_FLOOR,
  WEB_SEARCH_TOOL,
  type ContentBlock,
  type Phase1Checkpoint,
} from '@/lib/blue-filler/research/phase1';
import { CITATION_CAP, CITED_TEXT_MAX } from '@/lib/blue-filler/schemas';

describe('WEB_SEARCH_TOOL', () => {
  it('pins the verified tool version, name and use cap', () => {
    expect(WEB_SEARCH_TOOL).toEqual({
      type: 'web_search_20260318',
      name: 'web_search',
      max_uses: 12,
    });
  });

  it('leaves allowed_callers and response_inclusion at their defaults', () => {
    // Setting allowed_callers would turn dynamic filtering off; overriding
    // response_inclusion would strip the consumed result blocks we harvest from.
    expect(WEB_SEARCH_TOOL).not.toHaveProperty('allowed_callers');
    expect(WEB_SEARCH_TOOL).not.toHaveProperty('response_inclusion');
  });
});

describe('normalizeUrl', () => {
  it('collapses scheme, www and a trailing slash', () => {
    const canonical = normalizeUrl('https://example.com/a/b');
    expect(normalizeUrl('http://example.com/a/b')).toBe(canonical);
    expect(normalizeUrl('https://www.example.com/a/b')).toBe(canonical);
    expect(normalizeUrl('https://EXAMPLE.com/a/b/')).toBe(canonical);
    expect(normalizeUrl('https://example.com/a/b#section')).toBe(canonical);
  });

  it('collapses default ports', () => {
    expect(normalizeUrl('http://example.com:80/a')).toBe(normalizeUrl('https://example.com/a'));
    expect(normalizeUrl('https://example.com:443/a')).toBe(normalizeUrl('http://example.com/a'));
  });

  it('preserves the query string as a distinguishing part', () => {
    expect(normalizeUrl('https://example.com/s?q=1')).not.toBe(normalizeUrl('https://example.com/s?q=2'));
    expect(normalizeUrl('https://example.com/s?q=1')).toBe(normalizeUrl('http://www.example.com/s?q=1'));
  });

  it('keeps a non-default port distinct', () => {
    expect(normalizeUrl('https://example.com:8443/a')).not.toBe(normalizeUrl('https://example.com/a'));
  });

  it('falls back to the raw value for an unparseable URL', () => {
    expect(normalizeUrl('  NOT a url ')).toBe('not a url');
  });
});

// A dynamic-filtering-shaped response: the server_tool_use / web_search_tool_result
// pair is NESTED inside a code-execution result block carrying a `caller` field,
// alongside top-level blocks and a text block with its own citations array.
const DYNAMIC_FILTERING_RESPONSE: ContentBlock[] = [
  { type: 'thinking', thinking: 'planning' },
  {
    type: 'code_execution_tool_result',
    tool_use_id: 'srvtoolu_nested',
    content: [
      {
        type: 'server_tool_use',
        id: 'srvtoolu_1',
        name: 'web_search',
        caller: 'code_execution_20250825',
        input: { query: 'denial management adoption' },
      },
      {
        type: 'web_search_tool_result',
        tool_use_id: 'srvtoolu_1',
        caller: 'code_execution_20250825',
        content: [
          {
            type: 'web_search_result',
            url: 'https://www.nested-source.com/report/',
            title: 'Nested source',
            encrypted_content: 'ENCRYPTED_A',
          },
          {
            type: 'web_search_result',
            // Same page as the first, via a different scheme + www — must dedupe.
            url: 'http://nested-source.com/report',
            title: 'Nested source duplicate',
            encrypted_content: 'ENCRYPTED_B',
          },
        ],
      },
    ],
  },
  {
    type: 'web_search_tool_result',
    tool_use_id: 'srvtoolu_2',
    content: [
      {
        type: 'web_search_result',
        url: 'https://toplevel-source.com/a',
        title: 'Top level source',
        encrypted_content: 'ENCRYPTED_C',
      },
    ],
  },
  {
    type: 'text',
    text: 'Findings so far.',
    citations: [
      {
        type: 'web_search_result_location',
        url: 'https://cited-in-text.com/paper',
        title: 'Cited in text',
        cited_text: 'x'.repeat(CITED_TEXT_MAX + 50),
      },
    ],
  },
];

describe('harvestCitations', () => {
  const result = harvestCitations(DYNAMIC_FILTERING_RESPONSE);

  it('finds nested, top-level and text-block citations', () => {
    const urls = result.citations.map((citation) => citation.url);
    expect(urls).toContain('https://www.nested-source.com/report/');
    expect(urls).toContain('https://toplevel-source.com/a');
    expect(urls).toContain('https://cited-in-text.com/paper');
  });

  it('dedupes scheme/www variants of the same page', () => {
    expect(result.citations).toHaveLength(3);
  });

  it('truncates cited_text at the cap', () => {
    const cited = result.citations.find((citation) => citation.url.includes('cited-in-text'));
    expect(cited!.cited_text).toHaveLength(CITED_TEXT_MAX);
  });

  it('records no error codes for a healthy response', () => {
    expect(result.errorCodes).toEqual([]);
  });

  it('treats an EMPTY results array as a no-match, not an error', () => {
    const harvested = harvestCitations([
      { type: 'web_search_tool_result', tool_use_id: 't', content: [] },
    ]);
    expect(harvested.citations).toEqual([]);
    expect(harvested.errorCodes).toEqual([]);
  });

  it('records HTTP-200 server-tool error objects, top-level and nested', () => {
    const harvested = harvestCitations([
      {
        type: 'web_search_tool_result',
        tool_use_id: 't1',
        content: { type: 'web_search_tool_result_error', error_code: 'max_uses_exceeded' },
      },
      {
        type: 'code_execution_tool_result',
        content: [
          {
            type: 'web_search_tool_result',
            tool_use_id: 't2',
            caller: 'code_execution_20250825',
            content: { type: 'web_search_tool_result_error', error_code: 'too_many_requests' },
          },
        ],
      },
    ]);
    expect(harvested.errorCodes.sort()).toEqual(['max_uses_exceeded', 'too_many_requests']);
    expect(harvested.citations).toEqual([]);
  });

  it('caps the citation list', () => {
    const many: ContentBlock[] = [
      {
        type: 'web_search_tool_result',
        tool_use_id: 't',
        content: Array.from({ length: CITATION_CAP + 25 }, (_, i) => ({
          type: 'web_search_result',
          url: `https://source-${i}.com/`,
          title: `S${i}`,
        })),
      },
    ];
    expect(harvestCitations(many).citations).toHaveLength(CITATION_CAP);
  });

  it('survives malformed content without throwing', () => {
    expect(() => harvestCitations(undefined)).not.toThrow();
    expect(harvestCitations([{ type: 'web_search_tool_result', content: 'nope' }]).citations).toEqual(
      [],
    );
  });
});

describe('extractText / countSearches', () => {
  it('joins only text blocks, in order', () => {
    expect(
      extractText([
        { type: 'text', text: 'one' },
        { type: 'thinking', thinking: 'ignored' },
        { type: 'text', text: 'two' },
      ]),
    ).toBe('one\ntwo');
  });

  it('reads the web_search_requests counter defensively', () => {
    expect(countSearches({ usage: { server_tool_use: { web_search_requests: 7 } } })).toBe(7);
    expect(countSearches({})).toBe(0);
    expect(countSearches({ usage: { server_tool_use: { web_search_requests: -3 } } })).toBe(0);
  });
});

describe('appendAssistantTurn', () => {
  it('preserves every request parameter and all prior messages, appending exactly one turn', () => {
    const base = buildPhase1Request('research this');
    const content = DYNAMIC_FILTERING_RESPONSE;
    const next = appendAssistantTurn(base, content);

    expect(next.model).toBe(base.model);
    expect(next.max_tokens).toBe(base.max_tokens);
    expect(next.system).toBe(base.system);
    expect(next.tools).toEqual(base.tools);
    expect(next.messages).toHaveLength(base.messages.length + 1);
    expect(next.messages.slice(0, base.messages.length)).toEqual(base.messages);
    expect(next.messages.at(-1)!.role).toBe('assistant');
  });

  it('carries the content array back VERBATIM, including encrypted_content', () => {
    const next = appendAssistantTurn(buildPhase1Request('x'), DYNAMIC_FILTERING_RESPONSE);
    expect(next.messages.at(-1)!.content).toBe(DYNAMIC_FILTERING_RESPONSE);
    expect(JSON.stringify(next.messages.at(-1)!.content)).toContain('ENCRYPTED_A');
    expect(JSON.stringify(next.messages.at(-1)!.content)).toContain('ENCRYPTED_C');
  });

  it('never inserts a synthetic user message', () => {
    const next = appendAssistantTurn(buildPhase1Request('x'), DYNAMIC_FILTERING_RESPONSE);
    expect(next.messages.filter((message) => message.role === 'user')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// The loop
// ---------------------------------------------------------------------------

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body, text: async () => '' } as unknown as Response;
}

const LONG_TEXT = 'F'.repeat(USABLE_FINDINGS_FLOOR + 10);
const SHORT_TEXT = 'F'.repeat(20);

function loopOptions(overrides: Partial<Parameters<typeof runPhase1>[0]> = {}) {
  return {
    userContent: 'research this',
    nextTimeoutMs: () => 30_000,
    checkpoint: vi.fn(async () => 'applied' as const),
    ...overrides,
  };
}

describe('runPhase1', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('checkpoints after EVERY response — initial and each continuation', async () => {
    fetchMock
      .mockResolvedValueOnce(
        ok({
          stop_reason: 'pause_turn',
          content: [{ type: 'text', text: 'part one. ' }],
          usage: { server_tool_use: { web_search_requests: 3 } },
        }),
      )
      .mockResolvedValueOnce(
        ok({
          stop_reason: 'pause_turn',
          content: [{ type: 'text', text: 'part two. ' }],
          usage: { server_tool_use: { web_search_requests: 2 } },
        }),
      )
      .mockResolvedValueOnce(
        ok({ stop_reason: 'end_turn', content: [{ type: 'text', text: LONG_TEXT }] }),
      );

    const options = loopOptions();
    const outcome = await runPhase1(options);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(options.checkpoint).toHaveBeenCalledTimes(3);
    expect(outcome.outcome).toBe('ok');
    expect(outcome.searchCount).toBe(5);
    expect(outcome.findingsMd).toContain('part one');
    expect(outcome.findingsMd).toContain('part two');
  });

  it('checkpoints citations and search_count but NOT findings when a response has no synthesis text', async () => {
    fetchMock
      .mockResolvedValueOnce(
        ok({
          stop_reason: 'pause_turn',
          content: DYNAMIC_FILTERING_RESPONSE.filter((block) => block.type !== 'text'),
          usage: { server_tool_use: { web_search_requests: 4 } },
        }),
      )
      .mockResolvedValueOnce(
        ok({ stop_reason: 'end_turn', content: [{ type: 'text', text: LONG_TEXT }] }),
      );

    const checkpoints: Phase1Checkpoint[] = [];
    await runPhase1(
      loopOptions({
        checkpoint: async (checkpoint) => {
          checkpoints.push({ ...checkpoint, citations: [...checkpoint.citations] });
          return 'applied';
        },
      }),
    );

    expect(checkpoints[0].findingsMd).toBe('');
    expect(checkpoints[0].citations.length).toBeGreaterThan(0);
    expect(checkpoints[0].searchCount).toBe(4);
    expect(checkpoints[1].findingsMd).toContain('F');
  });

  it('stops silently when a checkpoint is fenced by a stale flip', async () => {
    fetchMock.mockResolvedValue(
      ok({ stop_reason: 'end_turn', content: [{ type: 'text', text: LONG_TEXT }] }),
    );
    const outcome = await runPhase1(loopOptions({ checkpoint: async () => 'fenced' }));
    expect(outcome.outcome).toBe('fenced');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('aborts when a checkpoint write errors', async () => {
    fetchMock.mockResolvedValue(
      ok({ stop_reason: 'pause_turn', content: [{ type: 'text', text: LONG_TEXT }] }),
    );
    const outcome = await runPhase1(loopOptions({ checkpoint: async () => 'error' }));
    expect(outcome.outcome).toBe('aborted');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caps continuations and returns what it has', async () => {
    fetchMock.mockResolvedValue(
      ok({ stop_reason: 'pause_turn', content: [{ type: 'text', text: 'more. ' }] }),
    );
    const outcome = await runPhase1(loopOptions({ maxContinuations: 4 }));
    // 1 initial + 4 continuations.
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(outcome.outcome).toBe('ok');
  });

  // The continuation-cap exit must apply the SAME usability guard as a natural
  // stop. Without it, a run that only ever paused for tool calls would return
  // 'ok' with no findings and reach phase 2.
  it('throws search_failed when the continuation cap is hit with no synthesis text', async () => {
    fetchMock.mockResolvedValue(
      ok({
        stop_reason: 'pause_turn',
        content: [{ type: 'web_search_tool_result', tool_use_id: 't', content: [] }],
        usage: { server_tool_use: { web_search_requests: 2 } },
      }),
    );
    await expect(runPhase1(loopOptions({ maxContinuations: 4 }))).rejects.toMatchObject({
      code: 'search_failed',
    });
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('throws search_failed when the cap is hit with citations but no text', async () => {
    fetchMock.mockResolvedValue(
      ok({
        stop_reason: 'pause_turn',
        content: DYNAMIC_FILTERING_RESPONSE.filter((block) => block.type !== 'text'),
      }),
    );
    await expect(runPhase1(loopOptions({ maxContinuations: 2 }))).rejects.toMatchObject({
      code: 'search_failed',
    });
  });

  it('stops continuing when the budget closes', async () => {
    fetchMock.mockResolvedValue(
      ok({ stop_reason: 'pause_turn', content: [{ type: 'text', text: 'more. ' }] }),
    );
    let calls = 0;
    await expect(
      runPhase1(
        loopOptions({
          nextTimeoutMs: () => {
            calls += 1;
            return calls === 1 ? 30_000 : null;
          },
        }),
      ),
    ).rejects.toMatchObject({ code: 'timeout' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports truncation and never lets the caller run phase 2', async () => {
    fetchMock.mockResolvedValue(
      ok({ stop_reason: 'max_tokens', content: [{ type: 'text', text: LONG_TEXT }] }),
    );
    const outcome = await runPhase1(loopOptions());
    expect(outcome.outcome).toBe('truncated');
    expect(outcome.findingsMd.length).toBeGreaterThanOrEqual(USABLE_FINDINGS_FLOOR);
  });

  it('reports truncation with sub-floor text too — the caller applies the floor rule', async () => {
    fetchMock.mockResolvedValue(
      ok({ stop_reason: 'max_tokens', content: [{ type: 'text', text: SHORT_TEXT }] }),
    );
    const outcome = await runPhase1(loopOptions());
    expect(outcome.outcome).toBe('truncated');
    expect(outcome.findingsMd.length).toBeLessThan(USABLE_FINDINGS_FLOOR);
  });

  it('throws search_failed when a finished turn produced no text at all', async () => {
    fetchMock.mockResolvedValue(ok({ stop_reason: 'end_turn', content: [{ type: 'thinking' }] }));
    await expect(runPhase1(loopOptions())).rejects.toMatchObject({ code: 'search_failed' });
  });

  it('classifies a timeout, a network failure, a bad status and a bad body', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('x', 'TimeoutError'));
    await expect(runPhase1(loopOptions())).rejects.toMatchObject({ code: 'timeout' });

    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(runPhase1(loopOptions())).rejects.toMatchObject({ code: 'provider_error' });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'web search disabled for this organization',
    } as unknown as Response);
    await expect(runPhase1(loopOptions())).rejects.toMatchObject({ code: 'provider_error' });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('bad json');
      },
    } as unknown as Response);
    await expect(runPhase1(loopOptions())).rejects.toMatchObject({ code: 'provider_error' });
  });

  it('surfaces server-tool error codes without failing the run', async () => {
    fetchMock.mockResolvedValue(
      ok({
        stop_reason: 'end_turn',
        content: [
          {
            type: 'web_search_tool_result',
            tool_use_id: 't',
            content: { type: 'web_search_tool_result_error', error_code: 'query_too_long' },
          },
          { type: 'text', text: LONG_TEXT },
        ],
      }),
    );
    const outcome = await runPhase1(loopOptions());
    expect(outcome.outcome).toBe('ok');
    expect(outcome.serverToolErrors).toEqual(['query_too_long']);
  });

  it('preserves the request across a real continuation round-trip', async () => {
    fetchMock
      .mockResolvedValueOnce(
        ok({ stop_reason: 'pause_turn', content: DYNAMIC_FILTERING_RESPONSE }),
      )
      .mockResolvedValueOnce(
        ok({ stop_reason: 'end_turn', content: [{ type: 'text', text: LONG_TEXT }] }),
      );

    await runPhase1(loopOptions());

    const first = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const second = JSON.parse(fetchMock.mock.calls[1][1].body as string);

    expect(second.model).toBe(first.model);
    expect(second.system).toBe(first.system);
    expect(second.tools).toEqual(first.tools);
    expect(second.max_tokens).toBe(first.max_tokens);
    expect(second.messages[0]).toEqual(first.messages[0]);
    expect(second.messages).toHaveLength(2);
    expect(second.messages[1].role).toBe('assistant');
    expect(JSON.stringify(second.messages[1].content)).toContain('ENCRYPTED_A');
    for (const banned of ['temperature', 'top_p', 'top_k', 'thinking', 'tool_choice']) {
      expect(second).not.toHaveProperty(banned);
    }
  });

  it('exposes Phase1Error as a real error class', () => {
    const err = new Phase1Error('timeout', 'x');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('timeout');
  });
});
