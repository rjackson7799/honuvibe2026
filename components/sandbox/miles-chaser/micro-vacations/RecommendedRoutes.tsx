'use client';

// Ported from MilesChaser src/components/micro-vacations/RecommendedRoutes.tsx
// with the demo's excluded-area edits:
// - Premium upsell block DELETED (billing is excluded; the store always
//   returns isPremiumRequired: false).
// - The !homeAirport empty state is action-less (unreachable with the fixed
//   seed profile; /settings doesn't exist in the demo).
// - Booking feedback ADDED: the source swallowed errors into console.error
//   and showed no success state — the just-booked card now renders an inline
//   confirmation with a link to the trips list, and failures show an inline
//   error line.
import { useState } from 'react';
import Link from 'next/link';
import { useMicroVacations, revalidateMicroVacations } from '../hooks/useMicroVacations';
import { createTrip } from '../hooks/useTrips';
import { mcHref } from '../paths';
import type { ScoredRoute } from '@/lib/sandbox/miles-chaser/types/domain';
import RouteCard from './RouteCard';
import LoadingSpinner from '../ui/LoadingSpinner';
import EmptyState from '../ui/EmptyState';

interface RecommendedRoutesProps {
  homeAirport: string | null;
  enrollmentId: string | null;
}

/** Returns the next Saturday as YYYY-MM-DD */
function getNextWeekendDate(): string {
  const now = new Date();
  const daysUntilSat = (6 - now.getDay() + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilSat);
  return next.toISOString().split('T')[0];
}

export default function RecommendedRoutes({
  homeAirport,
  enrollmentId,
}: RecommendedRoutesProps) {
  const {
    recommendations,
    isLoading,
    error,
  } = useMicroVacations({ origin: homeAirport, enrollmentId });
  const [addingRouteId, setAddingRouteId] = useState<string | null>(null);
  const [bookedRouteId, setBookedRouteId] = useState<string | null>(null);
  const [failedRouteId, setFailedRouteId] = useState<string | null>(null);

  async function handleAddToTrips(route: ScoredRoute) {
    if (!enrollmentId) return;
    setAddingRouteId(route.id);
    setBookedRouteId(null);
    setFailedRouteId(null);
    try {
      const departureDate = getNextWeekendDate();
      const halfMiles = Math.round(route.estimatedQualifyingMiles / 2);
      const halfFare = Math.round(route.averageFare / 2);

      await createTrip({
        enrollment_id: enrollmentId,
        is_earning_flight: true,
        status: 'planned',
        trip_type: 'micro_vacation_suggestion',
        trip_purpose: 'vacation',
        notes: `Micro-vacation: ${route.origin} → ${route.destination} (${route.efficiencyScore} QM/$)`,
        segments: [
          {
            origin: route.origin,
            destination: route.destination,
            departure_date: departureDate,
            airline_code: 'AS',
            segment_order: 1,
            estimated_qualifying_miles: halfMiles,
            estimated_qualifying_segments: 1,
            estimated_qualifying_dollars: halfFare,
          },
          {
            origin: route.destination,
            destination: route.origin,
            departure_date: departureDate,
            airline_code: 'AS',
            segment_order: 2,
            estimated_qualifying_miles: halfMiles,
            estimated_qualifying_segments: 1,
            estimated_qualifying_dollars: halfFare,
          },
        ],
      });
      await revalidateMicroVacations();
      setBookedRouteId(route.id);
    } catch {
      setFailedRouteId(route.id);
    } finally {
      setAddingRouteId(null);
    }
  }

  if (!homeAirport) {
    return (
      <EmptyState
        icon={
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        }
        title="No home airport"
        description="This demo profile has a fixed home airport."
      />
    );
  }

  if (isLoading) return <LoadingSpinner className="py-8" />;

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400 py-4">
        Failed to load recommendations.
      </p>
    );
  }

  if (recommendations.length === 0) {
    return (
      <EmptyState
        title="No routes available"
        description={`No micro-vacation routes found from ${homeAirport}. Check back later!`}
      />
    );
  }

  return (
    <div className="space-y-3">
      {recommendations.map((route) => (
        <div key={route.id}>
          <RouteCard
            route={route}
            onAddToTrips={handleAddToTrips}
            loading={addingRouteId === route.id}
          />
          {bookedRouteId === route.id && (
            <p
              role="status"
              className="mt-1.5 text-sm text-emerald-700 dark:text-emerald-400"
            >
              Added to your trips.{' '}
              <Link href={mcHref('/trips')} className="font-medium underline underline-offset-2">
                View trips
              </Link>
            </p>
          )}
          {failedRouteId === route.id && (
            <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
              Could not add this trip. Please try again.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
