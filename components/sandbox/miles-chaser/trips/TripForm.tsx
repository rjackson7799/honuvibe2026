'use client';

// Ported from MilesChaser src/components/trips/TripForm.tsx — navigation
// prefixed with mcHref; otherwise verbatim.
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useEnrollments } from '../hooks/useEnrollments';
import { createTrip } from '../hooks/useTrips';
import { mcHref } from '../paths';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import SegmentFields, { type SegmentData } from './SegmentFields';

const TRIP_PURPOSE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'business', label: 'Business' },
  { value: 'vacation', label: 'Vacation' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'family', label: 'Family' },
  { value: 'mileage_run', label: 'Mileage Run' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'completed', label: 'Completed' },
];

function emptySegment(): SegmentData {
  return {
    origin: '',
    destination: '',
    departure_date: '',
    return_date: '',
    airline_code: '',
    flight_number: '',
    fare_class: '',
    is_partner_flight: false,
  };
}

export default function TripForm() {
  const router = useRouter();
  const { enrollments } = useEnrollments();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [isEarning, setIsEarning] = useState(true);
  const [enrollmentId, setEnrollmentId] = useState('');
  const [status, setStatus] = useState('planned');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [segments, setSegments] = useState<SegmentData[]>([emptySegment()]);

  function handleSegmentChange(index: number, field: keyof SegmentData, value: string | boolean) {
    setSegments((prev) =>
      prev.map((seg, i) => (i === index ? { ...seg, [field]: value } : seg))
    );
  }

  function addSegment() {
    if (segments.length < 20) {
      setSegments((prev) => [...prev, emptySegment()]);
    }
  }

  function removeSegment(index: number) {
    if (segments.length > 1) {
      setSegments((prev) => prev.filter((_, i) => i !== index));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const segmentPayload = segments.map((seg, i) => ({
        origin: seg.origin,
        destination: seg.destination,
        departure_date: seg.departure_date,
        ...(seg.return_date ? { return_date: seg.return_date } : {}),
        airline_code: seg.airline_code,
        ...(seg.flight_number ? { flight_number: seg.flight_number } : {}),
        ...(seg.fare_class ? { fare_class: seg.fare_class } : {}),
        is_partner_flight: seg.is_partner_flight,
        segment_order: i + 1,
      }));

      await createTrip({
        is_earning_flight: isEarning,
        ...(isEarning && enrollmentId ? { enrollment_id: enrollmentId } : {}),
        status,
        trip_type: 'booked',
        ...(purpose ? { trip_purpose: purpose } : {}),
        ...(notes ? { notes } : {}),
        segments: segmentPayload,
      });

      router.push(mcHref('/trips'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  }

  const enrollmentOptions = enrollments.map((e) => ({
    value: e.id,
    label: e.loyalty_programs?.display_name || 'Unknown Program',
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">{error}</p>}

      {/* Trip details */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Trip Details</h3>

        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={isEarning}
            onChange={(e) => setIsEarning(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          Earning Flight (counts toward elite status)
        </label>

        {isEarning && enrollmentOptions.length > 0 && (
          <Select
            label="Enrollment"
            options={enrollmentOptions}
            value={enrollmentId}
            onChange={(e) => setEnrollmentId(e.target.value)}
            placeholder="Select enrollment..."
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Select label="Status" options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value)} />
          <Select label="Purpose" options={TRIP_PURPOSE_OPTIONS} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </div>

        <Input label="Notes" placeholder="Optional notes..." maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {/* Segments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Flight Segments</h3>
          <Button type="button" variant="secondary" size="sm" onClick={addSegment} disabled={segments.length >= 20}>
            + Add Segment
          </Button>
        </div>

        {segments.map((seg, i) => (
          <SegmentFields
            key={i}
            index={i}
            segment={seg}
            onChange={handleSegmentChange}
            onRemove={segments.length > 1 ? removeSegment : undefined}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Add Trip
        </Button>
      </div>
    </form>
  );
}
