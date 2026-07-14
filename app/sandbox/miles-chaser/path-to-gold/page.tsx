'use client';

// The source path-to-gold page is a one-line stub; this thin real page hosts
// the dashboard's PathToGoldChart with explicit load/error/empty states so
// the demo's 4-link nav lands somewhere real.
import { useEnrollments } from '@/components/sandbox/miles-chaser/hooks/useEnrollments';
import { useProjection } from '@/components/sandbox/miles-chaser/hooks/useProjection';
import PathToGoldChart from '@/components/sandbox/miles-chaser/dashboard/PathToGoldChart';
import LoadingSpinner from '@/components/sandbox/miles-chaser/ui/LoadingSpinner';

export default function PathToGoldPage() {
  const { enrollments, isLoading, error } = useEnrollments();
  const enrollment = enrollments[0];
  const { projection, error: projError } = useProjection(enrollment?.id ?? null);

  const body = (() => {
    if (error || projError)
      return <p className="text-sm text-red-600 dark:text-red-400 py-4">Failed to load projection data.</p>;
    if (isLoading || (enrollment && !projection))
      return <LoadingSpinner className="py-20" size="lg" />;
    if (!enrollment)
      return <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No enrollment in this demo profile.</p>;
    return <PathToGoldChart enrollment={enrollment} projection={projection!} />;
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Path to Gold</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Progress breakdown by metric</p>
      </div>
      {body}
    </div>
  );
}
