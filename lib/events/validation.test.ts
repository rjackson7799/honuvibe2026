import { describe, it, expect } from 'vitest';
import {
  validateEventForPublish,
  isReminderEligible,
  canSendInvites,
  canSendRecap,
} from './validation';

const valid = {
  title_en: 'Live Training',
  slug: 'live-training',
  starts_at: '2026-06-20T18:00:00Z',
  ends_at: '2026-06-20T19:30:00Z',
  timezone: 'Pacific/Honolulu',
  presenter_name: 'Jane Doe',
  meeting_url: 'https://zoom.us/j/123',
};

describe('validateEventForPublish', () => {
  it('returns no errors for a complete event', () => {
    expect(validateEventForPublish(valid)).toEqual([]);
  });

  it('flags missing title, slug, presenter, and meeting_url', () => {
    const errors = validateEventForPublish({
      ...valid,
      title_en: '',
      slug: '',
      presenter_name: '',
      meeting_url: '',
    });
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });

  it('flags an invalid slug', () => {
    expect(
      validateEventForPublish({ ...valid, slug: 'Bad Slug!' }).some((e) => /slug/i.test(e)),
    ).toBe(true);
  });

  it('flags ends_at before starts_at', () => {
    expect(
      validateEventForPublish({ ...valid, ends_at: '2026-06-20T17:00:00Z' }).some((e) =>
        /end/i.test(e),
      ),
    ).toBe(true);
  });

  it('flags an invalid timezone', () => {
    expect(
      validateEventForPublish({ ...valid, timezone: 'Not/AZone' }).some((e) => /time ?zone/i.test(e)),
    ).toBe(true);
  });
});

describe('send eligibility', () => {
  it('allows invites only for published, non-cancelled events', () => {
    expect(canSendInvites({ is_published: true, status: 'scheduled' })).toBe(true);
    expect(canSendInvites({ is_published: false, status: 'draft' })).toBe(false);
    expect(canSendInvites({ is_published: true, status: 'cancelled' })).toBe(false);
  });

  it('allows recap send only when recap_published and not cancelled', () => {
    expect(canSendRecap({ recap_published: true, status: 'completed' })).toBe(true);
    expect(canSendRecap({ recap_published: false, status: 'completed' })).toBe(false);
    expect(canSendRecap({ recap_published: true, status: 'cancelled' })).toBe(false);
  });

  it('reminders skip not_going invitees', () => {
    expect(isReminderEligible({ status: 'going' })).toBe(true);
    expect(isReminderEligible({ status: 'invited' })).toBe(true);
    expect(isReminderEligible({ status: 'not_going' })).toBe(false);
  });
});
