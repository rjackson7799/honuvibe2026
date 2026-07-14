'use client';

// Ported from MilesChaser src/app/(app)/trips/new/page.tsx — import paths
// only; otherwise verbatim.
import TripForm from '@/components/sandbox/miles-chaser/trips/TripForm';

export default function NewTripPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add New Trip</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter your flight details to track qualifying activity</p>
      </div>

      <TripForm />
    </div>
  );
}
