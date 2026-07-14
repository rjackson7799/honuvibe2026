'use client';

// Ported from MilesChaser src/components/trips/TripList.tsx — navigation
// prefixed with mcHref via router.push (the source used window.location);
// otherwise verbatim. The source has no /csv-import affordance here.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTrips, type TripFilters } from '../hooks/useTrips';
import { mcHref } from '../paths';
import TripCard from './TripCard';
import Select from '../ui/Select';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import LoadingSpinner from '../ui/LoadingSpinner';

const STATUS_FILTER = [
  { value: '', label: 'All Statuses' },
  { value: 'planned', label: 'Planned' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'pending_credit', label: 'Pending Credit' },
];

export default function TripList() {
  const router = useRouter();
  const [filters, setFilters] = useState<TripFilters>({ limit: 20, offset: 0 });
  const { trips, pagination, error, isLoading } = useTrips(filters);

  function setFilter(key: keyof TripFilters, value: string | boolean | number) {
    setFilters((prev) => ({ ...prev, [key]: value, offset: 0 }));
  }

  if (isLoading) return <LoadingSpinner className="py-12" />;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Failed to load trips</p>
        <Button variant="secondary" size="sm" className="mt-2" onClick={() => setFilters({ ...filters })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <Select
          aria-label="Filter by status"
          options={STATUS_FILTER}
          value={filters.status || ''}
          onChange={(e) => setFilter('status', e.target.value)}
          className="w-40"
        />
      </div>

      {/* Trip list */}
      {trips.length === 0 ? (
        <EmptyState
          title="No trips yet"
          description="Add your first trip to start tracking your progress toward elite status."
          actionLabel="Add Trip"
          onAction={() => router.push(mcHref('/trips/new'))}
        />
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="secondary"
            size="sm"
            disabled={pagination.offset === 0}
            onClick={() => setFilters((f) => ({ ...f, offset: Math.max(0, (f.offset || 0) - (f.limit || 20)) }))}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={pagination.offset + pagination.limit >= pagination.total}
            onClick={() => setFilters((f) => ({ ...f, offset: (f.offset || 0) + (f.limit || 20) }))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
