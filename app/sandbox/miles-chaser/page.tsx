'use client';

// Ported from MilesChaser src/app/(app)/dashboard/page.tsx. Demo edits:
// useSubscription/isPremium DELETED (billing excluded); Quick Actions keep
// only "+ Add Trip" (/ocr and /audit are excluded areas); the no-enrollment
// empty state is action-less (unreachable with the fixed seed; /settings
// doesn't exist in the demo); all navigation prefixed with mcHref.
import Link from 'next/link';
import { useEnrollments } from '@/components/sandbox/miles-chaser/hooks/useEnrollments';
import { useTrips } from '@/components/sandbox/miles-chaser/hooks/useTrips';
import { useProjection } from '@/components/sandbox/miles-chaser/hooks/useProjection';
import { useProfile } from '@/components/sandbox/miles-chaser/hooks/useProfile';
import { mcHref } from '@/components/sandbox/miles-chaser/paths';
import StatusCard from '@/components/sandbox/miles-chaser/dashboard/StatusCard';
import PathToGoldChart from '@/components/sandbox/miles-chaser/dashboard/PathToGoldChart';
import RecommendedRoutes from '@/components/sandbox/miles-chaser/micro-vacations/RecommendedRoutes';
import TripCard from '@/components/sandbox/miles-chaser/trips/TripCard';
import EmptyState from '@/components/sandbox/miles-chaser/ui/EmptyState';
import LoadingSpinner from '@/components/sandbox/miles-chaser/ui/LoadingSpinner';
import Button from '@/components/sandbox/miles-chaser/ui/Button';

export default function DashboardPage() {
  const { enrollments, isLoading: enrollLoading } = useEnrollments();
  const { trips, isLoading: tripsLoading } = useTrips({ limit: 5 });
  const { profile } = useProfile();

  const primaryEnrollment = enrollments[0];
  const { projection } = useProjection(primaryEnrollment?.id ?? null);

  if (enrollLoading || tripsLoading) {
    return <LoadingSpinner className="py-20" size="lg" />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track your progress toward elite status</p>
      </div>

      {/* Status */}
      {primaryEnrollment ? (
        <StatusCard enrollment={primaryEnrollment} projection={projection} />
      ) : (
        <EmptyState
          title="No enrollment yet"
          description="This demo profile comes with a fixed loyalty-program enrollment."
        />
      )}

      {/* Path to Gold Chart */}
      {primaryEnrollment && projection && projection.pacing !== 'achieved' && (
        <PathToGoldChart enrollment={primaryEnrollment} projection={projection} />
      )}

      {/* Quick Actions */}
      {primaryEnrollment && (
        <div className="grid grid-cols-2 gap-3">
          <Link href={mcHref('/trips/new')}>
            <Button variant="secondary" size="sm" fullWidth>+ Add Trip</Button>
          </Link>
        </div>
      )}

      {/* Micro-Vacation Recommendations */}
      {primaryEnrollment && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Recommended Micro-Vacations
          </h2>
          <RecommendedRoutes
            homeAirport={profile?.home_airport || null}
            enrollmentId={primaryEnrollment.id}
          />
        </div>
      )}

      {/* Recent Trips */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Trips</h2>
          <Link href={mcHref('/trips')}>
            <Button variant="secondary" size="sm">View All</Button>
          </Link>
        </div>

        {trips.length > 0 ? (
          <div className="space-y-3">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No trips yet"
            description="Add your first trip to see it here."
            actionLabel="Add Trip"
            onAction={() => (window.location.href = mcHref('/trips/new'))}
          />
        )}
      </div>
    </div>
  );
}
