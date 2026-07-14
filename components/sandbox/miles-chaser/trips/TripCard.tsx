'use client';

// Ported from MilesChaser src/components/trips/TripCard.tsx — navigation
// prefixed with mcHref; otherwise verbatim.
import Link from 'next/link';
import type { TripWithSegments } from '../hooks/useTrips';
import { mcHref } from '../paths';
import Badge from '../ui/Badge';

const PURPOSE_LABELS: Record<string, string> = {
  business: 'Business',
  vacation: 'Vacation',
  wedding: 'Wedding',
  family: 'Family',
  mileage_run: 'Mileage Run',
  other: 'Other',
};

interface TripCardProps {
  trip: TripWithSegments;
}

export default function TripCard({ trip }: TripCardProps) {
  const segments = trip.trip_segments || [];
  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];

  const totalMiles = segments.reduce((sum, s) => sum + (s.actual_qualifying_miles ?? s.estimated_qualifying_miles), 0);

  return (
    <Link href={mcHref(`/trips/${trip.id}`)} className="block">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {firstSeg && lastSeg && (
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {firstSeg.origin} → {lastSeg.destination}
              </span>
            )}
            {segments.length > 2 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({segments.length} segments)
              </span>
            )}
          </div>
          <Badge status={trip.status}>
            {trip.status === 'pending_credit' ? 'Pending' : trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
          </Badge>
        </div>

        {/* Segment details */}
        <div className="mt-2 space-y-1">
          {segments.map((seg) => (
            <div key={seg.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-mono">{seg.airline_code}{seg.flight_number ? ` ${seg.flight_number}` : ''}</span>
              <span>{seg.origin} → {seg.destination}</span>
              <span className="text-xs">{seg.departure_date}</span>
              {seg.fare_class && <span className="text-xs font-mono">({seg.fare_class})</span>}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3">
            {trip.trip_purpose && <span>{PURPOSE_LABELS[trip.trip_purpose] || trip.trip_purpose}</span>}
            {trip.is_earning_flight && <Badge variant="blue">Earning</Badge>}
          </div>
          <span>{totalMiles.toLocaleString()} QM</span>
        </div>
      </div>
    </Link>
  );
}
