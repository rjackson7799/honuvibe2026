'use client';

// Ported from MilesChaser src/app/(app)/trips/page.tsx. Demo edits: the
// "Import CSV" affordance DELETED (CSV import is an excluded area);
// navigation prefixed with mcHref.
import Link from 'next/link';
import TripList from '@/components/sandbox/miles-chaser/trips/TripList';
import Button from '@/components/sandbox/miles-chaser/ui/Button';
import { mcHref } from '@/components/sandbox/miles-chaser/paths';

export default function TripsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Trips</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your flights and track qualifying activity</p>
        </div>
        <div className="flex gap-2">
          <Link href={mcHref('/trips/new')}>
            <Button size="sm">+ Add Trip</Button>
          </Link>
        </div>
      </div>

      <TripList />
    </div>
  );
}
