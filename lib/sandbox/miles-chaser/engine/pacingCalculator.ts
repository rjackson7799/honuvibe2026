import { differenceInDays, differenceInMonths, isAfter } from 'date-fns';
import type { PacingInput, PacingResult, PacingStatus } from '../types/domain';

/**
 * Calculates pacing status and monthly targets.
 *
 * Pacing thresholds (delta = completionPct - expectedPct):
 *   achieved: completionPct >= 100
 *   ahead:    delta > +10
 *   on_track: delta >= -5
 *   behind:   delta >= -20
 *   at_risk:  delta < -20 or past year end
 *
 * Achievable: monthlyTargetQM <= 5000 or gapQM === 0
 */
export function calculatePacing(input: PacingInput): PacingResult {
  if (input.completionPct >= 100) {
    return {
      pacing: 'achieved',
      monthsRemaining: 0,
      monthlyTargetQM: 0,
      monthlyTargetQS: 0,
      monthlyTargetQD: 0,
      expectedPct: 100,
      achievable: true,
    };
  }

  const totalDays = differenceInDays(input.yearEnd, input.yearStart);
  const elapsedDays = differenceInDays(input.today, input.yearStart);
  const clampedElapsed = Math.max(0, Math.min(elapsedDays, totalDays));
  const expectedPct = totalDays > 0 ? (clampedElapsed / totalDays) * 100 : 0;

  const monthsRaw = differenceInMonths(input.yearEnd, input.today);
  const monthsRemaining = isAfter(input.today, input.yearEnd)
    ? 0
    : Math.max(1, monthsRaw);

  const monthlyTargetQM =
    monthsRemaining > 0 ? Math.ceil(input.gapQM / monthsRemaining) : input.gapQM;
  const monthlyTargetQS =
    monthsRemaining > 0 ? Math.ceil(input.gapQS / monthsRemaining) : input.gapQS;
  const monthlyTargetQD =
    monthsRemaining > 0 ? Math.ceil(input.gapQD / monthsRemaining) : input.gapQD;

  const achievable = input.gapQM === 0 || monthlyTargetQM <= 5000;

  let pacing: PacingStatus;
  const delta = input.completionPct - expectedPct;

  if (delta > 10) {
    pacing = 'ahead';
  } else if (delta >= -5) {
    pacing = 'on_track';
  } else if (delta >= -20) {
    pacing = 'behind';
  } else {
    pacing = 'at_risk';
  }

  if (isAfter(input.today, input.yearEnd)) {
    pacing = 'at_risk';
  }

  return {
    pacing,
    monthsRemaining,
    monthlyTargetQM,
    monthlyTargetQS,
    monthlyTargetQD,
    expectedPct: Math.round(expectedPct * 100) / 100,
    achievable,
  };
}
