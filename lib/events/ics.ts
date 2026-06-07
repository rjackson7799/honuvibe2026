import { createEvent, type DateArray, type EventAttributes } from 'ics';

/**
 * Input for a single live-event calendar invite.
 *
 * Note: there is intentionally NO meeting/Zoom field. The calendar's clickable
 * destination is always the gated event page, so a forwarded `.ics` cannot leak
 * the meeting link outside the platform.
 */
export interface EventIcsInput {
  /** Stable UID, e.g. `${eventId}@honuvibe.ai`. */
  uid: string;
  title: string;
  description?: string;
  startsAt: Date;
  endsAt?: Date | null;
  /** The gated `/learn/dashboard/events/[slug]` URL — used as URL + LOCATION. */
  eventPageUrl: string;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

function toUtcArray(d: Date): DateArray {
  return [
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
  ];
}

/** Builds an RFC 5545 VCALENDAR string for a live-event invite attachment. */
export function buildEventIcs(input: EventIcsInput): string {
  const end = input.endsAt ?? new Date(input.startsAt.getTime() + ONE_HOUR_MS);

  const attributes: EventAttributes = {
    uid: input.uid,
    title: input.title,
    description: input.description,
    start: toUtcArray(input.startsAt),
    startInputType: 'utc',
    startOutputType: 'utc',
    end: toUtcArray(end),
    endInputType: 'utc',
    endOutputType: 'utc',
    url: input.eventPageUrl,
    location: input.eventPageUrl,
    status: 'CONFIRMED',
    productId: 'honuvibe/ics',
    method: 'PUBLISH',
  };

  const { error, value } = createEvent(attributes);
  if (error || !value) {
    throw new Error(`Failed to build ICS: ${error?.message ?? 'unknown error'}`);
  }
  return value;
}
