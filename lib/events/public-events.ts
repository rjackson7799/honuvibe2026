/**
 * Manually-curated PUBLIC / FREE events.
 *
 * IMPORTANT: this is NOT the invite-only `live_events` Postgres table
 * (see supabase/migrations/044_live_events.sql + lib/events/queries.ts). Those
 * events are RLS-gated to invited, authenticated users and carry meeting URLs
 * and recap assets. The entries here are hand-authored marketing content for
 * *public, free* events — they drive the site-wide announcement strip and the
 * public /events/[slug] registration pages.
 *
 * Registration is captured: the public registration page POSTs name + email +
 * referral to /api/events/rsvp, which persists to the `event_rsvps` table
 * (supabase/migrations/048_event_rsvps.sql) and enforces `capacity` below. The
 * event *content* still lives here (hand-authored); only the attendee list is
 * in the database.
 *
 * To feature an event in the site-wide strip, set `active: true`. Keep at most
 * one active at a time — `featuredEvent()` returns the first active entry.
 */

import type { EventLocale } from './types';

export type PublicEvent = {
  slug: string;
  /** When true, this event drives the site-wide announcement strip. */
  active: boolean;
  /** ISO 8601 start instant. Rendered via formatEventDateTime in this dir. */
  startsAt: string;
  /** Optional ISO 8601 end instant — drives the displayed time range. */
  endsAt?: string;
  /** IANA timezone for display, e.g. 'Pacific/Honolulu'. */
  timezone: string;
  titleEn: string;
  titleJp: string;
  /** One-line hook shown in the strip. */
  blurbEn: string;
  blurbJp: string;
  /** Longer body shown on the event page. Plain text; newlines preserved. */
  descriptionEn: string;
  descriptionJp: string;
  /** How/where the event runs, e.g. 'Live on Zoom'. */
  formatEn: string;
  formatJp: string;
  /** Maximum attendees. Enforced atomically by claim_event_seat (migration 048). */
  capacity: number;
  /** When registration submission closes. Defaults to startsAt when unset. */
  registrationClosesAt?: string;
  /** Join URL (e.g. Zoom). Delivered only AFTER a registrant confirms — never shown pre-confirm. */
  meetingUrl?: string;
  presenterName?: string;
  presenterTitleEn?: string;
  presenterTitleJp?: string;
  presenterBioEn?: string;
  presenterBioJp?: string;
  presenterPhotoUrl?: string;
  /** "What you'll learn" bullets shown in the detail panel. */
  learnPointsEn: string[];
  learnPointsJp: string[];
  coverImageUrl?: string;
};

export const PUBLIC_EVENTS: PublicEvent[] = [
  {
    slug: 'ai-prompting-jumpstart',
    active: true,
    startsAt: '2026-07-09T18:00:00-10:00',
    endsAt: '2026-07-09T19:00:00-10:00',
    timezone: 'Pacific/Honolulu',
    titleEn: 'AI Prompting Jumpstart',
    titleJp: 'AIプロンプト入門',
    blurbEn: 'Free live AI session',
    blurbJp: '無料AIライブセッション',
    descriptionEn:
      'A free, beginner-friendly hour on getting real results from AI. We’ll cover how to write prompts that actually work, the handful of tools worth your time, and a simple workflow you can reuse the same night. Bring your laptop and a question — you’ll leave with something built.\n\nNo experience needed. Recorded for everyone who registers.',
    descriptionJp:
      'AIから本当に役立つ結果を引き出すための、無料・初心者向けの1時間です。実際に機能するプロンプトの書き方、使う価値のある厳選ツール、その日のうちに再利用できるシンプルなワークフローをご紹介します。ノートパソコンと質問をひとつご用意ください — 何かを作って持ち帰れます。\n\n経験は不要です。お申し込みの方全員に録画をお送りします。',
    formatEn: 'Live on Zoom',
    formatJp: 'Zoomでライブ開催',
    capacity: 100,
    meetingUrl: 'https://zoom.us/j/0000000000',
    presenterName: 'Ryan Jackson',
    presenterTitleEn: 'Founder, HonuVibe.AI',
    presenterTitleJp: 'HonuVibe.AI 創設者',
    presenterBioEn:
      'Ryan builds and ships AI tools in Hawaii and teaches the practical workflows behind them — bridging the US and Japan AI communities.',
    presenterBioJp:
      'ライアンはハワイを拠点にAIツールを開発・提供し、その実践的なワークフローを教えています。日米のAIコミュニティの架け橋となることを目指しています。',
    learnPointsEn: [
      'Write prompts that produce reliable, usable results',
      'Pick the handful of AI tools actually worth your time',
      'Build a simple workflow you can reuse the same night',
      'Avoid the common beginner mistakes that waste hours',
    ],
    learnPointsJp: [
      '信頼でき、実際に使えるプロンプトの書き方',
      '本当に使う価値のある厳選AIツールの選び方',
      'その日のうちに再利用できるシンプルなワークフローの構築',
      '時間を無駄にする初心者によくある失敗の回避',
    ],
  },
];

/** The single event currently featured in the site-wide strip, if any. */
export function featuredEvent(): PublicEvent | null {
  return PUBLIC_EVENTS.find((e) => e.active) ?? null;
}

/**
 * Look up a public event by slug. Returns ANY known event regardless of `active`
 * — `active` only controls strip-featuring (see `featuredEvent`). Past/inactive
 * events stay routable so their pages render a "registration closed" state
 * instead of 404ing.
 */
export function publicEventBySlug(slug: string): PublicEvent | null {
  return PUBLIC_EVENTS.find((e) => e.slug === slug) ?? null;
}

export type RegistrationState = 'open' | 'closed' | 'ended';

/**
 * Whether registration is open for an event. `ended` once the event is over,
 * `closed` once the submission window (registrationClosesAt, default startsAt)
 * has passed, otherwise `open`. Note: confirmation has its own deadline (event
 * start) enforced inside claim_event_seat.
 */
export function eventRegistrationState(e: PublicEvent, now: Date = new Date()): RegistrationState {
  const start = new Date(e.startsAt);
  const end = e.endsAt ? new Date(e.endsAt) : start;
  if (now >= end) return 'ended';
  const closesAt = e.registrationClosesAt ? new Date(e.registrationClosesAt) : start;
  if (now >= closesAt) return 'closed';
  return 'open';
}

/** Locale-aware field pickers — keep call sites tidy on the page + strip. */
export function publicEventTitle(e: PublicEvent, lang: EventLocale): string {
  return lang === 'ja' ? e.titleJp : e.titleEn;
}
export function publicEventBlurb(e: PublicEvent, lang: EventLocale): string {
  return lang === 'ja' ? e.blurbJp : e.blurbEn;
}
export function publicEventDescription(e: PublicEvent, lang: EventLocale): string {
  return lang === 'ja' ? e.descriptionJp : e.descriptionEn;
}
export function publicEventFormat(e: PublicEvent, lang: EventLocale): string {
  return lang === 'ja' ? e.formatJp : e.formatEn;
}
export function publicEventPresenterTitle(e: PublicEvent, lang: EventLocale): string | undefined {
  return lang === 'ja' ? e.presenterTitleJp : e.presenterTitleEn;
}
export function publicEventPresenterBio(e: PublicEvent, lang: EventLocale): string | undefined {
  return lang === 'ja' ? e.presenterBioJp : e.presenterBioEn;
}
export function publicEventLearnPoints(e: PublicEvent, lang: EventLocale): string[] {
  return lang === 'ja' ? e.learnPointsJp : e.learnPointsEn;
}
