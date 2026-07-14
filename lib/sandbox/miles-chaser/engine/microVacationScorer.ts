import type {
  MicroVacationScoringInput,
  RouteForScoring,
  ScoredRoute,
} from '../types/domain';

/**
 * Scores micro-vacation routes by gap-closing efficiency.
 * Pure function — no I/O.
 *
 * Efficiency = estimated_qualifying_miles / average_fare
 * Higher = better (more miles per dollar spent).
 *
 * Routes are sorted descending by efficiencyScore.
 */
export function scoreRoutes(
  routes: RouteForScoring[],
  gap: MicroVacationScoringInput
): ScoredRoute[] {
  const scored: ScoredRoute[] = [];

  for (const route of routes) {
    const result = scoreOneRoute(route, gap);
    if (result) scored.push(result);
  }

  scored.sort((a, b) => b.efficiencyScore - a.efficiencyScore);
  return scored;
}

function scoreOneRoute(
  route: RouteForScoring,
  gap: MicroVacationScoringInput
): ScoredRoute | null {
  const averageFare = computeAverageFare(route);
  if (averageFare <= 0) return null;

  const efficiencyScore =
    Math.round((route.estimatedQualifyingMiles / averageFare) * 100) / 100;

  const gapClosingPct =
    gap.gapQM > 0
      ? Math.round(
          Math.min(100, (route.estimatedQualifyingMiles / gap.gapQM) * 100) *
            100
        ) / 100
      : 100;

  const segmentsEarned = 2; // round-trip = 2 qualifying segments
  const estimatedQD = averageFare;

  const tripsNeededToClose =
    gap.gapQM > 0
      ? Math.ceil(gap.gapQM / route.estimatedQualifyingMiles)
      : 0;

  return {
    ...route,
    averageFare,
    efficiencyScore,
    gapClosingPct,
    segmentsEarned,
    estimatedQD,
    tripsNeededToClose,
  };
}

function computeAverageFare(route: RouteForScoring): number {
  if (route.currentFareEstimate && route.currentFareEstimate > 0) {
    return route.currentFareEstimate;
  }
  if (route.typicalFareLow && route.typicalFareHigh) {
    return (route.typicalFareLow + route.typicalFareHigh) / 2;
  }
  if (route.typicalFareLow) return route.typicalFareLow;
  if (route.typicalFareHigh) return route.typicalFareHigh;
  return 0;
}
