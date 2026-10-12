/**
 * Learning tracks — locked decision #6 (2026-10-04), migration 079.
 *
 * `TRACK_IDS` must match the CHECK constraints on content_items.track and
 * courses.track in supabase/migrations/079_tracks_and_vault_inclusion.sql
 * (__tests__/lib/tracks.test.ts parses that file). Labels and blurbs live in
 * the `tracks` i18n namespace, not here.
 */

export const TRACK_IDS = [
  'ai_essentials',
  'marketing_growth',
  'build_with_ai',
  'research_insights',
  'workflow_automation',
] as const;

export type TrackId = (typeof TRACK_IDS)[number];

export function isTrackId(value: unknown): value is TrackId {
  return typeof value === 'string' && (TRACK_IDS as readonly string[]).includes(value);
}

/**
 * Accepts a track id, or null/'' to clear. Anything else throws — the DB CHECK
 * would reject it anyway, this just fails earlier with a readable message.
 */
export function parseTrackInput(value: unknown): TrackId | null {
  if (value === null || value === '') return null;
  if (isTrackId(value)) return value;
  throw new Error(`Invalid track: ${String(value)}`);
}

/**
 * Stable short keys the 2026 green design uses for track chips
 * (docs/design_2026_green/HonuVibe Learn - Catalog.html). Card colours in the
 * design are per item, not per track, so there is no tone here.
 */
export const TRACK_KEYS: Record<TrackId, string> = {
  ai_essentials: 'ess',
  marketing_growth: 'mkt',
  build_with_ai: 'bld',
  research_insights: 'res',
  workflow_automation: 'wf',
};
