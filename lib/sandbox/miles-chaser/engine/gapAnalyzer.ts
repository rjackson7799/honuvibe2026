import type { GapAnalysisInput, GapAnalysisResult, TierInfo } from '../types/domain';

/**
 * Analyzes the gap between projected metrics and the target tier.
 *
 * Best-path logic: qualify via miles OR segments, but dollars always required.
 *   primaryCompletion = max(miles%, segments%)
 *   overall = min(primaryCompletion, dollars%)
 */
export function analyzeGap(input: GapAnalysisInput): GapAnalysisResult {
  const projectedQM = input.currentQM + input.plannedQM;
  const projectedQS = input.currentQS + input.plannedQS;
  const projectedQD = input.currentQD + input.plannedQD;

  const target = input.targetTier;

  const gapQM = Math.max(0, target.qm - projectedQM);
  const gapQS = Math.max(0, target.qs - projectedQS);
  const gapQD = Math.max(0, target.qd - projectedQD);

  const milesCompletionPct =
    target.qm > 0 ? Math.min(100, (projectedQM / target.qm) * 100) : 100;
  const segmentsCompletionPct =
    target.qs > 0 ? Math.min(100, (projectedQS / target.qs) * 100) : 100;
  const dollarsCompletionPct =
    target.qd > 0 ? Math.min(100, (projectedQD / target.qd) * 100) : 100;

  const primaryCompletionPct = Math.max(milesCompletionPct, segmentsCompletionPct);
  const completionPct = Math.min(primaryCompletionPct, dollarsCompletionPct);

  return {
    projectedQM,
    projectedQS,
    projectedQD,
    gapQM,
    gapQS,
    gapQD,
    completionPct: Math.round(completionPct * 100) / 100,
    milesCompletionPct: Math.round(milesCompletionPct * 100) / 100,
    segmentsCompletionPct: Math.round(segmentsCompletionPct * 100) / 100,
    dollarsCompletionPct: Math.round(dollarsCompletionPct * 100) / 100,
  };
}

/**
 * Finds the next tier above the given tier key.
 */
export function findNextTier(currentTierKey: string, tiers: TierInfo[]): TierInfo | null {
  const sorted = [...tiers].sort((a, b) => a.qm - b.qm);
  const currentIndex = sorted.findIndex((t) => t.key === currentTierKey);
  if (currentIndex === -1 || currentIndex >= sorted.length - 1) return null;
  return sorted[currentIndex + 1];
}
