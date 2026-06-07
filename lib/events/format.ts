import type { EventLocale } from './types';

/**
 * Formats an event start instant in the event's own timezone, localized to the
 * recipient. e.g. "Saturday, June 20, 2026 at 8:00 AM HST".
 */
export function formatEventDateTime(
  isoStart: string,
  timeZone: string,
  locale: EventLocale,
): string {
  return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone,
  }).format(new Date(isoStart));
}
