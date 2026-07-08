import { describe, expect, test } from 'vitest';
import {
  eventRegistrationState,
  publicEventBySlug,
  type PublicEvent,
} from './public-events';

function mk(overrides: Partial<PublicEvent>): PublicEvent {
  return {
    slug: 't',
    active: true,
    startsAt: '2026-07-09T18:00:00-10:00',
    timezone: 'Pacific/Honolulu',
    titleEn: 'T',
    titleJp: 'T',
    blurbEn: '',
    blurbJp: '',
    descriptionEn: '',
    descriptionJp: '',
    formatEn: 'Live on Zoom',
    formatJp: 'Zoom',
    capacity: 100,
    learnPointsEn: [],
    learnPointsJp: [],
    ...overrides,
  };
}

describe('eventRegistrationState', () => {
  const now = new Date('2026-07-01T00:00:00Z');

  test('open before the event and registration close', () => {
    const e = mk({ startsAt: '2026-08-01T00:00:00Z', endsAt: '2026-08-01T01:00:00Z' });
    expect(eventRegistrationState(e, now)).toBe('open');
  });

  test('ended once the event is over', () => {
    const e = mk({ startsAt: '2026-06-01T00:00:00Z', endsAt: '2026-06-01T01:00:00Z' });
    expect(eventRegistrationState(e, now)).toBe('ended');
  });

  test('closed when past registrationClosesAt but before start', () => {
    const e = mk({
      startsAt: '2026-08-01T00:00:00Z',
      endsAt: '2026-08-01T01:00:00Z',
      registrationClosesAt: '2026-06-15T00:00:00Z',
    });
    expect(eventRegistrationState(e, now)).toBe('closed');
  });

  test('defaults the close time to start when unset', () => {
    const e = mk({ startsAt: '2026-08-01T00:00:00Z', endsAt: '2026-08-01T01:00:00Z' });
    // Just before start → still open.
    expect(eventRegistrationState(e, new Date('2026-07-31T23:59:00Z'))).toBe('open');
    // After start, before end → registration closed (event in progress).
    expect(eventRegistrationState(e, new Date('2026-08-01T00:30:00Z'))).toBe('closed');
  });
});

describe('publicEventBySlug', () => {
  test('returns a known event regardless of active', () => {
    expect(publicEventBySlug('ai-prompting-jumpstart')?.slug).toBe('ai-prompting-jumpstart');
  });

  test('returns null for an unknown slug', () => {
    expect(publicEventBySlug('does-not-exist')).toBeNull();
  });
});
