import { describe, expect, it } from 'vitest';
import {
  citationSchema,
  CITED_TEXT_MAX,
  generatedIdeaSchema,
  generatedKillMemoSchema,
  generateRequestSchema,
  IDEA_TOOL,
  KILL_MEMO_TOOL,
  RESEARCH_REPORT_TOOL,
  scoresSchema,
  structuredResearchSchema,
} from '@/lib/blue-filler/schemas';
import { INDUSTRY_KEYS } from '@/lib/blue-filler/industry-map';
import { SCORE_KEYS } from '@/lib/blue-filler/types';

const validScores = { gap: 8, market: 6, fit: 7, speed: 5, moat: 4, exit: 6 };

function validThesis(overrides: Record<string, unknown> = {}) {
  return {
    target_user: 'Revenue cycle manager at a 20-provider clinic group',
    pain: 'Denials are worked by hand from a spreadsheet',
    ai_solution: 'Reads the denial, drafts the appeal, tracks the deadline',
    service_attachment: 'A monthly denial review call',
    adoption_blocker: 'Payer portals have no APIs and the liability sits with the biller',
    moat_angle: 'A growing corpus of payer-specific appeal language that wins',
    mvp_scope: 'Upload a denial PDF, get a drafted appeal letter',
    exit_assumptions: {
      assumed_multiple: 4,
      price_point_monthly_usd: 800,
      target_exit_usd: 25_000_000,
    },
    acquirer_hypothesis: ['RCM platform consolidators buying denial-specific capability'],
    ...overrides,
  };
}

function validIdea(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Denial Desk',
    one_liner: 'AI appeals for clinic denial queues.',
    summary_md: '## Why now\n\nDenials are up and staffing is down.',
    thesis: validThesis(),
    scores: validScores,
    industry_key: 'healthcare-rev-cycle',
    ...overrides,
  };
}

describe('scoresSchema', () => {
  it('accepts exactly the six integer keys', () => {
    expect(scoresSchema.parse(validScores)).toEqual(validScores);
  });

  it('is strict — an extra key is a rejection, not a silent drop', () => {
    const result = scoresSchema.safeParse({ ...validScores, composite: 72 });
    expect(result.success).toBe(false);
  });

  it('rejects out-of-range and non-integer values', () => {
    for (const bad of [0, 11, 5.5, '7', null]) {
      expect(scoresSchema.safeParse({ ...validScores, gap: bad }).success).toBe(false);
    }
  });

  it('rejects a missing key', () => {
    const partial = { ...validScores } as Record<string, unknown>;
    delete partial.moat;
    expect(scoresSchema.safeParse(partial).success).toBe(false);
  });
});

describe('generatedIdeaSchema', () => {
  it('accepts a well-formed idea', () => {
    expect(generatedIdeaSchema.safeParse(validIdea()).success).toBe(true);
  });

  it('rejects a slug, a composite or a grade smuggled in at any level', () => {
    expect(generatedIdeaSchema.safeParse(validIdea({ slug: 'denial-desk' })).success).toBe(false);
    expect(generatedIdeaSchema.safeParse(validIdea({ composite: 80 })).success).toBe(false);
    expect(generatedIdeaSchema.safeParse(validIdea({ grade: 'A' })).success).toBe(false);
  });

  it('rejects model-computed exit math', () => {
    expect(
      generatedIdeaSchema.safeParse(
        validIdea({
          thesis: validThesis({ exit_math: { needed_arr_usd: 1, customers_needed: 1 } }),
        }),
      ).success,
    ).toBe(false);
    expect(
      generatedIdeaSchema.safeParse(
        validIdea({ thesis: validThesis({ exit_in_thesis_band: true }) }),
      ).success,
    ).toBe(false);
  });

  it('rejects an unknown industry_key', () => {
    expect(generatedIdeaSchema.safeParse(validIdea({ industry_key: 'crypto' })).success).toBe(false);
  });

  it('accepts every key in the map', () => {
    for (const key of INDUSTRY_KEYS) {
      expect(generatedIdeaSchema.safeParse(validIdea({ industry_key: key })).success).toBe(true);
    }
  });

  it('enforces the title, one_liner and summary bounds', () => {
    expect(generatedIdeaSchema.safeParse(validIdea({ title: 'ab' })).success).toBe(false);
    expect(generatedIdeaSchema.safeParse(validIdea({ title: 'a'.repeat(121) })).success).toBe(false);
    expect(generatedIdeaSchema.safeParse(validIdea({ one_liner: 'a'.repeat(201) })).success).toBe(
      false,
    );
    expect(generatedIdeaSchema.safeParse(validIdea({ summary_md: 'a'.repeat(8001) })).success).toBe(
      false,
    );
  });

  it('enforces the exit-assumption bounds', () => {
    const outOfRange = validThesis({
      exit_assumptions: {
        assumed_multiple: 12,
        price_point_monthly_usd: 800,
        target_exit_usd: 25_000_000,
      },
    });
    expect(generatedIdeaSchema.safeParse(validIdea({ thesis: outOfRange })).success).toBe(false);
  });

  it('requires one to three acquirer hypotheses', () => {
    expect(
      generatedIdeaSchema.safeParse(validIdea({ thesis: validThesis({ acquirer_hypothesis: [] }) }))
        .success,
    ).toBe(false);
    expect(
      generatedIdeaSchema.safeParse(
        validIdea({ thesis: validThesis({ acquirer_hypothesis: ['a', 'b', 'c', 'd'] }) }),
      ).success,
    ).toBe(false);
  });
});

describe('tool schemas', () => {
  const toolJson = JSON.stringify(IDEA_TOOL);

  it('the idea tool exposes no slug, exit_math or composite field', () => {
    expect(toolJson).not.toContain('"slug"');
    expect(toolJson).not.toContain('exit_math');
    expect(toolJson).not.toContain('exit_in_thesis_band');
    expect(toolJson).not.toContain('"composite"');
    expect(toolJson).not.toContain('"grade"');
  });

  it('the idea tool enum-locks industry_key to the map', () => {
    const industry = IDEA_TOOL.input_schema.properties.industry_key as { enum: string[] };
    expect(industry.enum).toEqual([...INDUSTRY_KEYS]);
  });

  it('the idea and report tools require all six score keys', () => {
    for (const tool of [IDEA_TOOL, RESEARCH_REPORT_TOOL]) {
      const scores = (tool.input_schema.properties as Record<string, { required?: string[] }>)[
        tool === IDEA_TOOL ? 'scores' : 'revised_scores'
      ];
      expect(scores.required).toEqual([...SCORE_KEYS]);
    }
  });

  it('every tool declares its required fields', () => {
    for (const tool of [IDEA_TOOL, KILL_MEMO_TOOL, RESEARCH_REPORT_TOOL]) {
      expect(tool.input_schema.required.length).toBeGreaterThan(0);
      expect(tool.name.startsWith('submit_blue_filler_')).toBe(true);
    }
  });
});

describe('generatedKillMemoSchema', () => {
  const memo = {
    fatal_flaws: ['Payers will not integrate', 'Liability sits with the biller'],
    strongest_counterargument: 'Denial volume is genuinely rising.',
    cheapest_disproof: 'Call five billers and ask what they pay for appeals today.',
    verdict_lean: 'kill',
    memo_md: '## It fails because',
  };

  it('accepts a well-formed memo', () => {
    expect(generatedKillMemoSchema.safeParse(memo).success).toBe(true);
  });

  it('requires two to five fatal flaws', () => {
    expect(generatedKillMemoSchema.safeParse({ ...memo, fatal_flaws: ['one'] }).success).toBe(false);
    expect(
      generatedKillMemoSchema.safeParse({ ...memo, fatal_flaws: ['a', 'b', 'c', 'd', 'e', 'f'] })
        .success,
    ).toBe(false);
  });

  it('is strict and rejects an invalid lean', () => {
    expect(generatedKillMemoSchema.safeParse({ ...memo, extra: 1 }).success).toBe(false);
    expect(generatedKillMemoSchema.safeParse({ ...memo, verdict_lean: 'maybe' }).success).toBe(false);
  });
});

describe('structuredResearchSchema', () => {
  const report = {
    market_reality_md: 'x',
    adoption_evidence_md: 'x',
    competitor_landscape_md: 'x',
    acquirer_signals_md: 'x',
    risks_md: 'x',
    score_rationale: Object.fromEntries(SCORE_KEYS.map((key) => [key, `because ${key}`])),
  };

  it('accepts a report plus revised scores', () => {
    expect(structuredResearchSchema.safeParse({ report, revised_scores: validScores }).success).toBe(
      true,
    );
  });

  it('rejects a model-supplied composite alongside the scores', () => {
    expect(
      structuredResearchSchema.safeParse({ report, revised_scores: validScores, composite: 70 })
        .success,
    ).toBe(false);
  });

  it('requires a rationale for every score key', () => {
    const missing = { ...report, score_rationale: { gap: 'only gap' } };
    expect(
      structuredResearchSchema.safeParse({ report: missing, revised_scores: validScores }).success,
    ).toBe(false);
  });
});

describe('citationSchema', () => {
  it('accepts a harvested citation', () => {
    expect(
      citationSchema.safeParse({ url: 'https://example.com', title: 'T', cited_text: 'x' }).success,
    ).toBe(true);
  });

  it('rejects cited_text above the truncation cap', () => {
    expect(
      citationSchema.safeParse({
        url: 'https://example.com',
        title: 'T',
        cited_text: 'x'.repeat(CITED_TEXT_MAX + 1),
      }).success,
    ).toBe(false);
  });

  it('accepts exactly the cap', () => {
    expect(
      citationSchema.safeParse({
        url: 'https://example.com',
        title: 'T',
        cited_text: 'x'.repeat(CITED_TEXT_MAX),
      }).success,
    ).toBe(true);
  });
});

describe('generateRequestSchema', () => {
  // A real v4 UUID: zod enforces the RFC version/variant nibbles, and the client
  // always mints these with crypto.randomUUID().
  const requestId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

  it('accepts a bare request_id', () => {
    expect(generateRequestSchema.safeParse({ request_id: requestId }).success).toBe(true);
  });

  it('accepts anything crypto.randomUUID() produces', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(generateRequestSchema.safeParse({ request_id: crypto.randomUUID() }).success).toBe(true);
    }
  });

  it('rejects a non-uuid request_id and an unknown industry_key', () => {
    expect(generateRequestSchema.safeParse({ request_id: 'nope' }).success).toBe(false);
    expect(
      generateRequestSchema.safeParse({ request_id: requestId, industry_key: 'nope' }).success,
    ).toBe(false);
  });

  it('rejects an unknown field', () => {
    expect(
      generateRequestSchema.safeParse({ request_id: requestId, force_grade: 'A' }).success,
    ).toBe(false);
  });

  it('rejects an unknown mode', () => {
    expect(generateRequestSchema.safeParse({ request_id: requestId, mode: 'wild' }).success).toBe(
      false,
    );
  });
});
