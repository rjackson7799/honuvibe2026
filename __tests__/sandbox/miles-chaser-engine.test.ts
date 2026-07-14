import { describe, it, expect } from 'vitest';
import { runProjection } from '@/lib/sandbox/miles-chaser/engine/projectionEngine';
import type { ProjectionInput } from '@/lib/sandbox/miles-chaser/types/domain';

/**
 * Deterministic projection check: fixed `today`, trivially-summable fixture.
 * Guards the port — if an engine edit or a date-fns major bump changes the
 * math, this fails loudly with exact numbers (unlike the store's structural
 * "projection changed" assertion).
 */
const input: ProjectionInput = {
  enrollment: {
    id: 'e1',
    currentQM: 10_000,
    currentQS: 10,
    currentQD: 1_000,
    targetTierKey: 'gold',
    yearStart: '2030-01-01',
    yearEnd: '2030-12-31',
  },
  targetTier: { key: 'gold', name: 'Gold', qm: 40_000, qs: 30, qd: 4_000 },
  earningTrips: [
    {
      tripId: 't1',
      status: 'planned',
      segments: [
        {
          estimatedQM: 2_000, estimatedQS: 2, estimatedQD: 200,
          actualQM: null, actualQS: null, actualQD: null,
          fareClass: 'M', isPartnerFlight: false,
        },
      ],
    },
  ],
};
const TODAY = new Date('2030-07-01T00:00:00Z');

describe('projection engine (ported) — deterministic', () => {
  it('projects current + planned exactly', () => {
    const r = runProjection(input, TODAY);
    expect(r.currentQM).toBe(10_000);
    expect(r.projectedQM).toBe(12_000); // 10,000 current + 2,000 planned
    expect(r.projectedQS).toBe(12);
    expect(r.projectedQD).toBe(1_200);
    // gapQM is target − PROJECTED, clamped at 0 (source gapAnalyzer.ts:17:
    // `const gapQM = Math.max(0, target.qm - projectedQM);`)
    expect(r.gapQM).toBe(28_000); // 40,000 − 12,000
    expect(r.targetTier).toBe('gold');
    expect(['ahead', 'on_track', 'behind', 'achieved', 'at_risk']).toContain(r.pacing);
  });
});
