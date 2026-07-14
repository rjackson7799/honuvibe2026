import { parseISO } from 'date-fns';
import type {
  ProjectionInput,
  ProjectionResult,
  ProjectionDataSources,
  PacingStatus,
} from '../types/domain';
import { aggregateTripEarnings } from './earningCalculator';
import { analyzeGap } from './gapAnalyzer';
import { calculatePacing } from './pacingCalculator';

/**
 * Main projection orchestrator. Pure function — no I/O.
 *
 * 1. Aggregate planned trip values (prefer actual over estimated per segment)
 * 2. Analyze gap: current + planned vs target tier
 * 3. Calculate pacing: timeline-aware status + monthly targets
 * 4. Generate summary string
 * 5. Return ProjectionResult
 */
export function runProjection(
  input: ProjectionInput,
  today: Date = new Date()
): ProjectionResult {
  const aggregated = aggregateTripEarnings(input.earningTrips);

  const gapResult = analyzeGap({
    currentQM: input.enrollment.currentQM,
    currentQS: input.enrollment.currentQS,
    currentQD: input.enrollment.currentQD,
    plannedQM: aggregated.totalQM,
    plannedQS: aggregated.totalQS,
    plannedQD: aggregated.totalQD,
    targetTier: input.targetTier,
  });

  const pacingResult = calculatePacing({
    completionPct: gapResult.completionPct,
    gapQM: gapResult.gapQM,
    gapQS: gapResult.gapQS,
    gapQD: gapResult.gapQD,
    yearStart: parseISO(input.enrollment.yearStart),
    yearEnd: parseISO(input.enrollment.yearEnd),
    today,
  });

  const summary = generateSummary(
    input.targetTier.name,
    gapResult.completionPct,
    pacingResult.pacing,
    pacingResult.monthlyTargetQM,
    pacingResult.monthsRemaining,
    pacingResult.achievable,
    gapResult.gapQM
  );

  const dataSources: ProjectionDataSources = {
    enrollmentId: input.enrollment.id,
    totalTripsConsidered: input.earningTrips.filter((t) => t.status !== 'cancelled').length,
    totalSegmentsConsidered: aggregated.segmentCount,
    segmentsWithActuals: aggregated.segmentsWithActuals,
  };

  return {
    currentQM: input.enrollment.currentQM,
    currentQS: input.enrollment.currentQS,
    currentQD: input.enrollment.currentQD,
    projectedQM: gapResult.projectedQM,
    projectedQS: gapResult.projectedQS,
    projectedQD: gapResult.projectedQD,
    targetTier: input.targetTier.key,
    gapQM: gapResult.gapQM,
    gapQS: gapResult.gapQS,
    gapQD: gapResult.gapQD,
    pacing: pacingResult.pacing,
    monthlyTargetQM: pacingResult.monthlyTargetQM,
    monthlyTargetQS: pacingResult.monthlyTargetQS,
    monthlyTargetQD: pacingResult.monthlyTargetQD,
    summary,
    completionPct: gapResult.completionPct,
    achievable: pacingResult.achievable,
    dataSources,
  };
}

function generateSummary(
  tierName: string,
  completionPct: number,
  pacing: PacingStatus,
  monthlyTargetQM: number,
  monthsRemaining: number,
  achievable: boolean,
  gapQM: number
): string {
  if (pacing === 'achieved') {
    return `Congratulations! You've reached the requirements for ${tierName} status.`;
  }

  const pacingLabel: Record<PacingStatus, string> = {
    ahead: 'ahead of pace',
    on_track: 'on track',
    behind: 'behind pace',
    at_risk: 'at risk',
    achieved: 'achieved',
  };

  let msg = `You're ${Math.round(completionPct)}% of the way to ${tierName} and ${pacingLabel[pacing]}.`;

  if (monthsRemaining > 0 && gapQM > 0) {
    msg += ` You need about ${monthlyTargetQM.toLocaleString()} QM/month over the next ${monthsRemaining} month${monthsRemaining !== 1 ? 's' : ''}.`;
  }

  if (!achievable) {
    msg += ' This may be difficult to achieve at the current pace.';
  }

  return msg;
}
