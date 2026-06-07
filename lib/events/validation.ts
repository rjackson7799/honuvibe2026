import type { LiveEventStatus, RsvpStatus } from './types';

interface PublishCheckInput {
  title_en: string;
  slug: string;
  starts_at: string;
  ends_at?: string | null;
  timezone: string;
  presenter_name?: string | null;
  meeting_url?: string | null;
}

function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    // Throws RangeError for an unknown IANA zone.
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns a list of human-readable errors that block publishing an event.
 * Empty array = ready to publish/schedule.
 */
export function validateEventForPublish(event: PublishCheckInput): string[] {
  const errors: string[] = [];

  if (!event.title_en?.trim()) errors.push('Title (EN) is required.');

  if (!event.slug?.trim()) {
    errors.push('Slug is required.');
  } else if (!/^[a-z0-9-]+$/.test(event.slug)) {
    errors.push('Slug must be lowercase letters, numbers, and hyphens only.');
  }

  const start = event.starts_at ? new Date(event.starts_at) : null;
  if (!start || Number.isNaN(start.getTime())) {
    errors.push('A valid start date/time is required.');
  }

  if (!isValidTimeZone(event.timezone)) errors.push('A valid time zone is required.');

  if (!event.presenter_name?.trim()) errors.push('Presenter name is required.');

  if (!event.meeting_url?.trim()) errors.push('Meeting URL is required before publishing.');

  if (event.ends_at) {
    const end = new Date(event.ends_at);
    if (
      start &&
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      end <= start
    ) {
      errors.push('End time must be after the start time.');
    }
  }

  return errors;
}

/** Invites may only go out for a published, non-cancelled event. */
export function canSendInvites(event: {
  is_published: boolean;
  status: LiveEventStatus;
}): boolean {
  return event.is_published && event.status !== 'cancelled';
}

/** The recap email may only go out once recap_published (and not cancelled). */
export function canSendRecap(event: {
  recap_published: boolean;
  status: LiveEventStatus;
}): boolean {
  return event.recap_published && event.status !== 'cancelled';
}

/** Reminders skip invitees who declined. */
export function isReminderEligible(invitation: { status: RsvpStatus }): boolean {
  return invitation.status !== 'not_going';
}
