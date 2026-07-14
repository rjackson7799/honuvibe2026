// Ported from MilesChaser (fictional demo data only) — trimmed to the sandbox slice.
// Domain types for the projection engine and app logic

export type PacingStatus = 'on_track' | 'ahead' | 'behind' | 'at_risk' | 'achieved';

export interface TierInfo {
  key: string;
  name: string;
  qm: number;
  qs: number;
  qd: number;
}

// --- Projection Engine Input/Output Types ---

export interface ProjectionDataSources {
  enrollmentId: string;
  totalTripsConsidered: number;
  totalSegmentsConsidered: number;
  segmentsWithActuals: number;
}

export interface ProjectionResult {
  currentQM: number;
  currentQS: number;
  currentQD: number;
  projectedQM: number;
  projectedQS: number;
  projectedQD: number;
  targetTier: string;
  gapQM: number;
  gapQS: number;
  gapQD: number;
  pacing: PacingStatus;
  monthlyTargetQM: number;
  monthlyTargetQS: number;
  monthlyTargetQD: number;
  summary: string;
  completionPct: number;
  achievable: boolean;
  dataSources: ProjectionDataSources;
}

export interface SegmentEarningInput {
  estimatedQM: number;
  estimatedQS: number;
  estimatedQD: number;
  actualQM: number | null;
  actualQS: number | null;
  actualQD: number | null;
  fareClass: string | null;
  isPartnerFlight: boolean;
}

export interface AggregatedTripMetrics {
  totalQM: number;
  totalQS: number;
  totalQD: number;
  segmentCount: number;
  segmentsWithActuals: number;
}

export interface GapAnalysisInput {
  currentQM: number;
  currentQS: number;
  currentQD: number;
  plannedQM: number;
  plannedQS: number;
  plannedQD: number;
  targetTier: TierInfo;
}

export interface GapAnalysisResult {
  projectedQM: number;
  projectedQS: number;
  projectedQD: number;
  gapQM: number;
  gapQS: number;
  gapQD: number;
  completionPct: number;
  milesCompletionPct: number;
  segmentsCompletionPct: number;
  dollarsCompletionPct: number;
}

export interface PacingInput {
  completionPct: number;
  gapQM: number;
  gapQS: number;
  gapQD: number;
  yearStart: Date;
  yearEnd: Date;
  today: Date;
}

export interface PacingResult {
  pacing: PacingStatus;
  monthsRemaining: number;
  monthlyTargetQM: number;
  monthlyTargetQS: number;
  monthlyTargetQD: number;
  expectedPct: number;
  achievable: boolean;
}

export interface ProjectionInput {
  enrollment: {
    id: string;
    currentQM: number;
    currentQS: number;
    currentQD: number;
    targetTierKey: string;
    yearStart: string;
    yearEnd: string;
  };
  targetTier: TierInfo;
  earningTrips: Array<{
    tripId: string;
    status: string;
    segments: SegmentEarningInput[];
  }>;
}

// --- Micro-Vacation Scoring Types ---

export interface MicroVacationScoringInput {
  gapQM: number;
  gapQS: number;
  gapQD: number;
}

export interface RouteForScoring {
  id: string;
  origin: string;
  destination: string;
  typicalFareLow: number | null;
  typicalFareHigh: number | null;
  currentFareEstimate: number | null;
  estimatedQualifyingMiles: number;
  flightDurationMinutes: number | null;
  destinationTags: string[];
}

export interface ScoredRoute extends RouteForScoring {
  averageFare: number;
  efficiencyScore: number;
  gapClosingPct: number;
  segmentsEarned: number;
  estimatedQD: number;
  tripsNeededToClose: number;
}
