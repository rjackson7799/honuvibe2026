import type { SegmentEarningInput, AggregatedTripMetrics } from '../types/domain';

/**
 * Resolves a single segment's effective qualifying values.
 * Prefers actual values over estimated (all-or-nothing).
 */
export function resolveSegmentEarnings(segment: SegmentEarningInput): {
  qm: number;
  qs: number;
  qd: number;
  usedActuals: boolean;
} {
  const usedActuals =
    segment.actualQM !== null &&
    segment.actualQS !== null &&
    segment.actualQD !== null;

  return {
    qm: usedActuals ? segment.actualQM! : segment.estimatedQM,
    qs: usedActuals ? segment.actualQS! : segment.estimatedQS,
    qd: usedActuals ? segment.actualQD! : segment.estimatedQD,
    usedActuals,
  };
}

/**
 * Aggregates qualifying values across trips and their segments.
 * Skips cancelled trips.
 */
export function aggregateTripEarnings(
  trips: Array<{ tripId: string; status: string; segments: SegmentEarningInput[] }>
): AggregatedTripMetrics {
  let totalQM = 0;
  let totalQS = 0;
  let totalQD = 0;
  let segmentCount = 0;
  let segmentsWithActuals = 0;

  for (const trip of trips) {
    if (trip.status === 'cancelled') continue;

    for (const segment of trip.segments) {
      const resolved = resolveSegmentEarnings(segment);
      totalQM += resolved.qm;
      totalQS += resolved.qs;
      totalQD += resolved.qd;
      segmentCount += 1;
      if (resolved.usedActuals) segmentsWithActuals += 1;
    }
  }

  return { totalQM, totalQS, totalQD, segmentCount, segmentsWithActuals };
}
