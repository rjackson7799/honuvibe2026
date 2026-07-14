'use client';

import type { ScoredRoute } from '@/lib/sandbox/miles-chaser/types/domain';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface RouteCardProps {
  route: ScoredRoute;
  onAddToTrips: (route: ScoredRoute) => void;
  loading?: boolean;
}

export default function RouteCard({ route, onAddToTrips, loading }: RouteCardProps) {
  const durationHrs = route.flightDurationMinutes
    ? `${Math.floor(route.flightDurationMinutes / 60)}h ${route.flightDurationMinutes % 60}m`
    : null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {route.origin}
          </span>
          <svg
            className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {route.destination}
          </span>
          {durationHrs && (
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
              {durationHrs}
            </span>
          )}
        </div>
        <Badge variant="green">{route.efficiencyScore} QM/$</Badge>
      </div>

      {/* Destination tags */}
      {route.destinationTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {route.destinationTags.map((tag) => (
            <Badge key={tag} variant="gray">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Est. Miles
          </p>
          <p className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {route.estimatedQualifyingMiles.toLocaleString()} QM
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Cost Range
          </p>
          <p className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
            ${route.typicalFareLow?.toLocaleString() ?? '?'}&ndash;$
            {route.typicalFareHigh?.toLocaleString() ?? '?'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Gap Closes
          </p>
          <p className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {route.gapClosingPct.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {route.tripsNeededToClose > 0
            ? `${route.tripsNeededToClose} trip${route.tripsNeededToClose !== 1 ? 's' : ''} to close gap`
            : 'Gap already closed'}
        </span>
        <Button size="sm" onClick={() => onAddToTrips(route)} loading={loading}>
          + Add to Trips
        </Button>
      </div>
    </div>
  );
}
