'use client';

// Ported from MilesChaser src/app/(app)/trips/[id]/page.tsx — navigation
// prefixed with mcHref; otherwise verbatim (the source reads the id via the
// useParams hook, so Next 16's params-as-Promise change doesn't apply here).
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTrip, deleteTrip, updateTrip } from '@/components/sandbox/miles-chaser/hooks/useTrips';
import { mcHref } from '@/components/sandbox/miles-chaser/paths';
import Badge from '@/components/sandbox/miles-chaser/ui/Badge';
import Button from '@/components/sandbox/miles-chaser/ui/Button';
import Modal from '@/components/sandbox/miles-chaser/ui/Modal';
import LoadingSpinner from '@/components/sandbox/miles-chaser/ui/LoadingSpinner';
import Select from '@/components/sandbox/miles-chaser/ui/Select';

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'pending_credit', label: 'Pending Credit' },
];

const PURPOSE_LABELS: Record<string, string> = {
  business: 'Business',
  vacation: 'Vacation',
  wedding: 'Wedding',
  family: 'Family',
  mileage_run: 'Mileage Run',
  other: 'Other',
};

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { trip, isLoading } = useTrip(id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (isLoading) return <LoadingSpinner className="py-20" size="lg" />;

  if (!trip) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Trip not found</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => router.push(mcHref('/trips'))}>
          Back to Trips
        </Button>
      </div>
    );
  }

  const segments = trip.trip_segments || [];
  const totalEstMiles = segments.reduce((s, seg) => s + seg.estimated_qualifying_miles, 0);
  const totalActMiles = segments.reduce((s, seg) => s + (seg.actual_qualifying_miles ?? 0), 0);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteTrip(trip!.id);
      router.push(mcHref('/trips'));
    } catch {
      setDeleting(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    await updateTrip(trip!.id, { status: newStatus });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="secondary" size="sm" onClick={() => router.push(mcHref('/trips'))}>
          &larr; Back
        </Button>
        <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
          Delete Trip
        </Button>
      </div>

      {/* Trip header */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {segments[0]?.origin} &rarr; {segments[segments.length - 1]?.destination}
          </h1>
          <Badge status={trip.status}>
            {trip.status === 'pending_credit' ? 'Pending' : trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Type</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{trip.trip_type}</p>
          </div>
          {trip.trip_purpose && (
            <div>
              <p className="text-gray-500 dark:text-gray-400">Purpose</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{PURPOSE_LABELS[trip.trip_purpose] || trip.trip_purpose}</p>
            </div>
          )}
          <div>
            <p className="text-gray-500 dark:text-gray-400">Est. Miles</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{totalEstMiles.toLocaleString()}</p>
          </div>
          {totalActMiles > 0 && (
            <div>
              <p className="text-gray-500 dark:text-gray-400">Actual Miles</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{totalActMiles.toLocaleString()}</p>
            </div>
          )}
        </div>

        {trip.notes && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 italic">{trip.notes}</p>
        )}

        <div className="mt-4">
          <Select
            label="Update Status"
            options={STATUS_OPTIONS}
            value={trip.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-48"
          />
        </div>
      </div>

      {/* Segments */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Segments</h2>
        <div className="space-y-3">
          {segments.map((seg) => (
            <div
              key={seg.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                    {seg.airline_code}{seg.flight_number ? ` ${seg.flight_number}` : ''}
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 font-semibold">
                    {seg.origin} &rarr; {seg.destination}
                  </span>
                </div>
                {seg.fare_class && (
                  <Badge variant="gray">Class {seg.fare_class}</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Departs: {seg.departure_date}</span>
                {seg.return_date && <span>Returns: {seg.return_date}</span>}
                <span>Est: {seg.estimated_qualifying_miles.toLocaleString()} QM</span>
                {seg.actual_qualifying_miles !== null && (
                  <span>Actual: {seg.actual_qualifying_miles.toLocaleString()} QM</span>
                )}
                {seg.is_partner_flight && <Badge variant="purple">Partner</Badge>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Trip"
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      >
        Are you sure you want to delete this trip? This action cannot be undone and all segments will be removed.
      </Modal>
    </div>
  );
}
