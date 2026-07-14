'use client';

import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';

const FARE_CLASSES = [
  { value: '', label: "I don't know" },
  { value: 'F', label: 'F — First Class' },
  { value: 'J', label: 'J — Business' },
  { value: 'C', label: 'C — Business' },
  { value: 'Y', label: 'Y — Economy (Full)' },
  { value: 'B', label: 'B — Economy' },
  { value: 'M', label: 'M — Economy' },
  { value: 'H', label: 'H — Economy' },
  { value: 'K', label: 'K — Economy' },
  { value: 'Q', label: 'Q — Economy' },
  { value: 'L', label: 'L — Discount' },
  { value: 'S', label: 'S — Discount' },
  { value: 'T', label: 'T — Discount' },
  { value: 'V', label: 'V — Discount' },
  { value: 'X', label: 'X — Deep Discount' },
  { value: 'N', label: 'N — Deep Discount' },
];

export interface SegmentData {
  origin: string;
  destination: string;
  departure_date: string;
  return_date: string;
  airline_code: string;
  flight_number: string;
  fare_class: string;
  is_partner_flight: boolean;
}

interface SegmentFieldsProps {
  index: number;
  segment: SegmentData;
  onChange: (index: number, field: keyof SegmentData, value: string | boolean) => void;
  onRemove?: (index: number) => void;
  errors?: Partial<Record<keyof SegmentData, string>>;
}

export default function SegmentFields({ index, segment, onChange, onRemove, errors }: SegmentFieldsProps) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Segment {index + 1}</h4>
        {onRemove && (
          <Button variant="danger" size="sm" type="button" onClick={() => onRemove(index)}>
            Remove
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Origin (IATA)"
          placeholder="SEA"
          maxLength={4}
          value={segment.origin}
          onChange={(e) => onChange(index, 'origin', e.target.value.toUpperCase())}
          error={errors?.origin}
        />
        <Input
          label="Destination (IATA)"
          placeholder="HNL"
          maxLength={4}
          value={segment.destination}
          onChange={(e) => onChange(index, 'destination', e.target.value.toUpperCase())}
          error={errors?.destination}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Departure Date"
          type="date"
          value={segment.departure_date}
          onChange={(e) => onChange(index, 'departure_date', e.target.value)}
          error={errors?.departure_date}
        />
        <Input
          label="Return Date"
          type="date"
          value={segment.return_date}
          onChange={(e) => onChange(index, 'return_date', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Airline Code"
          placeholder="AS"
          maxLength={3}
          value={segment.airline_code}
          onChange={(e) => onChange(index, 'airline_code', e.target.value.toUpperCase())}
          error={errors?.airline_code}
        />
        <Input
          label="Flight Number"
          placeholder="123"
          maxLength={10}
          value={segment.flight_number}
          onChange={(e) => onChange(index, 'flight_number', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Fare Class"
          options={FARE_CLASSES}
          value={segment.fare_class}
          onChange={(e) => onChange(index, 'fare_class', e.target.value)}
        />
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={segment.is_partner_flight}
              onChange={(e) => onChange(index, 'is_partner_flight', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            Partner Flight
          </label>
        </div>
      </div>
    </div>
  );
}
