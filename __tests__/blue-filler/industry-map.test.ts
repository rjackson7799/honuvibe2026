import { describe, expect, it } from 'vitest';
import {
  buildIndustryPromptBlock,
  getIndustry,
  INDUSTRY_KEYS,
  INDUSTRY_MAP,
} from '@/lib/blue-filler/industry-map';

// A SMALL TRANSCRIPTION OF THE LEDGER (docs/blue-filler-sources.md rev 2, S1),
// duplicated here on purpose: it pins the map to the ledger, so an edit to the
// map that is not also an edit to the ledger fails the suite.
const LEDGER_S1: Record<
  string,
  { min: number; max: number | null; quadrant: 'autopilot' | 'next_wave' }
> = {
  'insurance-brokerage': { min: 140, max: 200, quadrant: 'autopilot' },
  'it-managed-services': { min: 100, max: null, quadrant: 'autopilot' },
  'payroll-compliance': { min: 50, max: 70, quadrant: 'autopilot' },
  'claims-adjusting': { min: 50, max: 80, quadrant: 'autopilot' },
  'accounting-audit': { min: 50, max: 80, quadrant: 'autopilot' },
  'healthcare-rev-cycle': { min: 50, max: 80, quadrant: 'autopilot' },
  'mortgage-origination': { min: 30, max: 50, quadrant: 'autopilot' },
  'kyc-aml': { min: 30, max: 50, quadrant: 'autopilot' },
  'paralegal-lpo': { min: 36, max: 36, quadrant: 'autopilot' },
  'tax-advisory': { min: 30, max: 35, quadrant: 'autopilot' },
  'legal-transactional': { min: 20, max: 25, quadrant: 'autopilot' },
  'real-estate-closing': { min: 20, max: 25, quadrant: 'autopilot' },
  'cost-estimation': { min: 16, max: 16, quadrant: 'autopilot' },
  'supply-chain-procurement': { min: 200, max: null, quadrant: 'next_wave' },
  'pharmacy-back-office': { min: 30, max: null, quadrant: 'next_wave' },
  'wealth-management-ops': { min: 30, max: null, quadrant: 'next_wave' },
  'medical-admin': { min: 20, max: null, quadrant: 'next_wave' },
  'fund-administration': { min: 15, max: 20, quadrant: 'next_wave' },
};

/** Ledger A1 — every domain share in Figure 6. A map value must be one of these. */
const LEDGER_A1_SHARES = [
  49.7, 9.1, 7.1, 4.4, 4.3, 4.0, 3.5, 2.8, 2.4, 2.2, 2.1, 1.9, 1.8, 1.3, 1.0, 0.9, 0.8,
];

/** The only two entries whose geographic scope the S1 article prose states. */
const PROSE_STATED_US_KEYS = ['accounting-audit', 'healthcare-rev-cycle'];

describe('industry map shape', () => {
  it('has between 18 and 20 entries', () => {
    expect(INDUSTRY_MAP.length).toBeGreaterThanOrEqual(18);
    expect(INDUSTRY_MAP.length).toBeLessThanOrEqual(20);
  });

  it('has unique keys, and INDUSTRY_KEYS mirrors them', () => {
    const keys = INDUSTRY_MAP.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...INDUSTRY_KEYS]).toEqual(keys);
  });

  it('every entry carries provenance fields and a YYYY-MM-DD review date', () => {
    for (const entry of INDUSTRY_MAP) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.promptNotes.length).toBeGreaterThan(0);
      expect(entry.lastReviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['extreme', 'high', 'moderate']).toContain(entry.gapTier);
      expect(Number.isInteger(entry.asOfYear)).toBe(true);
    }
  });

  it('getIndustry resolves known keys and nothing else', () => {
    expect(getIndustry('legal-transactional')?.label).toBe('Transactional legal work');
    expect(getIndustry('not-a-real-key')).toBeUndefined();
  });
});

describe('S1 transcription fidelity', () => {
  it('covers all 13 autopilot and all 5 next-wave verticals, and nothing from copilot/watch', () => {
    const s1Entries = INDUSTRY_MAP.filter((entry) => entry.sequoiaQuadrant !== null);
    expect(s1Entries).toHaveLength(Object.keys(LEDGER_S1).length);
    expect(s1Entries.filter((entry) => entry.sequoiaQuadrant === 'autopilot')).toHaveLength(13);
    expect(s1Entries.filter((entry) => entry.sequoiaQuadrant === 'next_wave')).toHaveLength(5);
    for (const entry of INDUSTRY_MAP) {
      expect(entry.sequoiaQuadrant).not.toBe('copilot');
      expect(entry.sequoiaQuadrant).not.toBe('watch');
    }
  });

  it('every market size and quadrant matches the ledger exactly', () => {
    for (const [key, ledger] of Object.entries(LEDGER_S1)) {
      const entry = getIndustry(key);
      expect(entry, `missing map entry for ${key}`).toBeDefined();
      expect(entry!.sequoiaQuadrant).toBe(ledger.quadrant);
      expect(entry!.marketSizeUsdBn).toEqual({ min: ledger.min, max: ledger.max });
      expect(entry!.basis).toBe('annual_spend');
    }
  });

  it('non-S1 entries carry no invented market size', () => {
    for (const entry of INDUSTRY_MAP) {
      if (entry.sequoiaQuadrant !== null) continue;
      // The ledger gives no size for these, so the only honest value is null —
      // unless an explicit source override says otherwise.
      if (entry.marketSizeUsdBn !== null) {
        expect(entry.sourceOverrides?.length ?? 0).toBeGreaterThan(0);
      } else {
        expect(entry.basis).toBeNull();
      }
    }
  });
});

describe('scope rule', () => {
  it("marks exactly the two prose-stated entries 'US'", () => {
    const usKeys = INDUSTRY_MAP.filter((entry) => entry.scope === 'US').map((entry) => entry.key);
    expect(usKeys.sort()).toEqual([...PROSE_STATED_US_KEYS].sort());
  });

  it("never marks an S1 entry 'global' without a sourceOverrides justification", () => {
    for (const entry of INDUSTRY_MAP) {
      if (entry.sequoiaQuadrant === null) continue;
      if (entry.scope === 'global') {
        expect(entry.sourceOverrides?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it("records every other entry's scope as 'unknown'", () => {
    for (const entry of INDUSTRY_MAP) {
      if (PROSE_STATED_US_KEYS.includes(entry.key)) continue;
      expect(entry.scope).toBe('unknown');
    }
  });
});

describe('A1 agent tool-call share', () => {
  it('only uses values that appear in the ledger A1 transcription', () => {
    for (const entry of INDUSTRY_MAP) {
      if (entry.anthropicAgentToolCallSharePct === undefined) continue;
      expect(LEDGER_A1_SHARES).toContain(entry.anthropicAgentToolCallSharePct);
    }
  });

  it('explains itself in promptNotes when the share is omitted', () => {
    for (const entry of INDUSTRY_MAP) {
      if (entry.anthropicAgentToolCallSharePct !== undefined) continue;
      expect(entry.promptNotes).toMatch(/no a1 domain plausibly matches/i);
    }
  });

  it('maps the ledger-named domains exactly', () => {
    expect(getIndustry('legal-transactional')?.anthropicAgentToolCallSharePct).toBe(0.9);
    expect(getIndustry('paralegal-lpo')?.anthropicAgentToolCallSharePct).toBe(0.9);
    expect(getIndustry('healthcare-rev-cycle')?.anthropicAgentToolCallSharePct).toBe(1.0);
    expect(getIndustry('medical-admin')?.anthropicAgentToolCallSharePct).toBe(1.0);
    expect(getIndustry('accounting-audit')?.anthropicAgentToolCallSharePct).toBe(4.0);
    expect(getIndustry('tax-advisory')?.anthropicAgentToolCallSharePct).toBe(4.0);
  });

  it('notes which of the two candidate domains supply chain uses', () => {
    const notes = getIndustry('supply-chain-procurement')!.promptNotes;
    expect(notes).toMatch(/travel and logistics/i);
    expect(notes).toMatch(/back-office automation/i);
  });
});

describe('crowded tasks', () => {
  it('flags medical coding on the healthcare entries (the canonical A3 example)', () => {
    for (const key of ['healthcare-rev-cycle', 'medical-admin']) {
      expect(getIndustry(key)!.crowdedTasks?.join(' ')).toMatch(/code patient data/i);
    }
  });
});

describe('buildIndustryPromptBlock', () => {
  const block = buildIndustryPromptBlock(INDUSTRY_MAP);

  it('is deterministic', () => {
    expect(buildIndustryPromptBlock(INDUSTRY_MAP)).toBe(block);
  });

  it('frames the agent share as NOT an adoption rate', () => {
    expect(block).toMatch(/NOT an adoption percentage/);
    expect(block).toMatch(/sampled agent TOOL CALLS/);
  });

  it('frames gapTier as a project heuristic, not an Anthropic classification', () => {
    expect(block).toMatch(/not an Anthropic classification/i);
  });

  it('frames crowded tasks as a caution, not proof of a served market', () => {
    expect(block).toMatch(/not proof the market is served/i);
  });

  it('carries basis, scope and year with every stated market size', () => {
    expect(block).toContain('$50-80B annual services spend, scope US, source published 2026');
    expect(block).toContain('$100B+ annual services spend, scope unknown, source published 2026');
  });

  it("says 'source published', never 'as of' — the ledger states no data currency", () => {
    expect(block).not.toContain('as of 20');
  });

  it('says so plainly when the source states no size', () => {
    expect(block).toContain('market: not stated by the source data');
  });

  it('renders one targeted entry without the rest', () => {
    const single = buildIndustryPromptBlock([getIndustry('kyc-aml')!]);
    expect(single).toContain('key: kyc-aml');
    expect(single).not.toContain('key: legal-transactional');
  });
});
