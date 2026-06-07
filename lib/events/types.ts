/**
 * Types for the invite-only Live Training Events feature.
 * Mirrors supabase/migrations/044_live_events.sql.
 */

export type EventLocale = 'en' | 'ja';

export type LiveEventStatus =
  | 'draft'
  | 'scheduled'
  | 'live'
  | 'completed'
  | 'cancelled';

export type RsvpStatus = 'invited' | 'going' | 'not_going';

export type AttendanceStatus = 'unknown' | 'attended' | 'no_show';

export type EmailSendStatus = 'sent' | 'failed';

export type EmailKind = 'invite' | 'reminder' | 'recap';

export interface RecapResource {
  label: string;
  url: string;
}

/** A row of public.live_events. Sensitive recap URLs live in EventRecapAssets. */
export interface LiveEvent {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string | null;
  description_en: string | null;
  description_jp: string | null;
  presenter_name: string | null;
  presenter_org: string | null;
  presenter_bio_en: string | null;
  presenter_bio_jp: string | null;
  starts_at: string; // ISO timestamptz
  ends_at: string | null;
  timezone: string; // IANA, e.g. 'Pacific/Honolulu'
  meeting_url: string | null;
  meeting_notes_en: string | null;
  meeting_notes_jp: string | null;
  capacity: number | null;
  cover_image_url: string | null;
  status: LiveEventStatus;
  is_published: boolean;
  recap_published: boolean;
  created_at: string;
  updated_at: string;
}

/** Protected recap payload — only readable once recap_published (RLS-gated). */
export interface EventRecapAssets {
  event_id: string;
  recording_url: string | null;
  slide_deck_url: string | null;
  transcript_url: string | null;
  recap_notes_en: string | null;
  recap_notes_jp: string | null;
  recap_resources: RecapResource[];
  updated_at: string;
}

/** A row of public.event_invitations — allowlist + RSVP + send-state. */
export interface EventInvitation {
  id: string;
  event_id: string;
  email: string;
  user_id: string | null;
  locale: EventLocale;
  status: RsvpStatus;
  rsvp_at: string | null;
  attendance_status: AttendanceStatus;
  attendance_marked_at: string | null;
  invited_at: string;
  invite_sent_at: string | null;
  reminder_sent_at: string | null;
  recap_sent_at: string | null;
  last_email_status: EmailSendStatus | null;
  last_email_error: string | null;
}

// --- Admin input shapes ------------------------------------------------------

export interface CreateEventInput {
  slug: string;
  title_en: string;
  title_jp?: string | null;
  description_en?: string | null;
  description_jp?: string | null;
  presenter_name?: string | null;
  presenter_org?: string | null;
  presenter_bio_en?: string | null;
  presenter_bio_jp?: string | null;
  starts_at: string;
  ends_at?: string | null;
  timezone?: string;
  meeting_url?: string | null;
  meeting_notes_en?: string | null;
  meeting_notes_jp?: string | null;
  capacity?: number | null;
  cover_image_url?: string | null;
}

export type UpdateEventInput = Partial<CreateEventInput> & {
  status?: LiveEventStatus;
};

export interface RecapAssetsInput {
  recording_url?: string | null;
  slide_deck_url?: string | null;
  transcript_url?: string | null;
  recap_notes_en?: string | null;
  recap_notes_jp?: string | null;
  recap_resources?: RecapResource[];
}

export interface AddInvitationInput {
  email: string;
  locale?: EventLocale;
}

/** Event joined with its invitations — the admin detail view shape. */
export interface AdminEventDetail {
  event: LiveEvent;
  recap: EventRecapAssets | null;
  invitations: EventInvitation[];
}
