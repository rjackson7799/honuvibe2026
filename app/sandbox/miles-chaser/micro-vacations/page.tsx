'use client';

// The source micro-vacations page is a one-line stub; this thin real page
// hosts RecommendedRoutes (which handles its own inner loading/empty/error
// states) with explicit outer load/error branches.
import { useEnrollments } from '@/components/sandbox/miles-chaser/hooks/useEnrollments';
import { useProfile } from '@/components/sandbox/miles-chaser/hooks/useProfile';
import RecommendedRoutes from '@/components/sandbox/miles-chaser/micro-vacations/RecommendedRoutes';
import LoadingSpinner from '@/components/sandbox/miles-chaser/ui/LoadingSpinner';

export default function MicroVacationsPage() {
  const { enrollments, isLoading: enrollLoading, error: enrollError } = useEnrollments();
  const { profile, isLoading: profileLoading, error: profileError } = useProfile();
  const enrollment = enrollments[0];

  const body = (() => {
    if (enrollError || profileError)
      return <p className="text-sm text-red-600 dark:text-red-400 py-4">Failed to load recommendations.</p>;
    if (enrollLoading || profileLoading)
      return <LoadingSpinner className="py-20" size="lg" />;
    if (!enrollment)
      return <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No enrollment in this demo profile.</p>;
    return (
      <RecommendedRoutes
        homeAirport={profile?.home_airport ?? null}
        enrollmentId={enrollment.id}
      />
    );
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Micro-Vacations</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Weekend routes that close your status gap efficiently
        </p>
      </div>
      {body}
    </div>
  );
}
