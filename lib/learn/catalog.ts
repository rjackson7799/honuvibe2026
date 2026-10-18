import { isTrackId, TRACK_IDS, type TrackId } from '@/lib/tracks';
import type { PublicCatalogItem } from '@/lib/vault/catalog';
import type { PublicCourse } from '@/lib/learn/public-courses';

/**
 * The Learn catalog model (redesign Unit 2a): Vault lessons + public courses
 * in one serializable list, plus the pure filter / URL helpers the client
 * islands share. No React, no I/O.
 */

export type CatalogMeta =
  | { kind: 'minutes' | 'weeks'; value: number }
  | { kind: 'type'; value: string }
  | null;

export type CatalogLevel = 'beginner' | 'intermediate' | 'advanced';

export type LearnCatalogEntry = {
  kind: 'lesson' | 'course';
  id: string;
  /** Locale-less; rendered through the next-intl Link. */
  href: string;
  /** Locale-resolved, EN fallback. */
  title: string;
  blurb: string;
  track: TrackId | null;
  free: boolean;
  featured: boolean;
  publishedAt: string | null;
  meta: CatalogMeta;
  level: CatalogLevel | null;
  /** Stable per id: sum of char codes mod 6. */
  coverTone: 0 | 1 | 2 | 3 | 4 | 5;
};

export type CatalogState = { track: TrackId | 'all'; query: string; freeOnly: boolean };

export const DEFAULT_CATALOG_STATE: CatalogState = { track: 'all', query: '', freeOnly: false };

const MAX_QUERY_LENGTH = 100;
const LEVELS: readonly CatalogLevel[] = ['beginner', 'intermediate', 'advanced'];

function toLevel(value: unknown): CatalogLevel | null {
  return LEVELS.includes(value as CatalogLevel) ? (value as CatalogLevel) : null;
}

function coverToneFor(id: string): LearnCatalogEntry['coverTone'] {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return (sum % 6) as LearnCatalogEntry['coverTone'];
}

function pick(locale: 'en' | 'ja', en: string | null, jp: string | null): string {
  return (locale === 'ja' ? jp || en : en) ?? '';
}

function fromLesson(item: PublicCatalogItem, locale: 'en' | 'ja'): LearnCatalogEntry {
  return {
    kind: 'lesson',
    id: item.id,
    href: `/learn/vault/${item.slug}`,
    title: pick(locale, item.title_en, item.title_jp),
    blurb: pick(locale, item.description_en, item.description_jp),
    track: item.track,
    free: item.access_tier === 'free',
    featured: item.is_featured,
    publishedAt: item.publish_date,
    meta: item.duration_minutes
      ? { kind: 'minutes', value: item.duration_minutes }
      : { kind: 'type', value: item.content_type },
    level: toLevel(item.difficulty_level),
    coverTone: coverToneFor(item.id),
  };
}

function fromCourse(course: PublicCourse, locale: 'en' | 'ja'): LearnCatalogEntry {
  return {
    kind: 'course',
    id: course.id,
    href: `/learn/${course.slug}`,
    title: pick(locale, course.title_en, course.title_jp),
    blurb: pick(locale, course.description_en, course.description_jp),
    track: course.track,
    free: course.price_usd === 0 && course.price_jpy === 0,
    featured: course.is_featured,
    publishedAt: course.created_at,
    meta: course.total_weeks ? { kind: 'weeks', value: course.total_weeks } : null,
    level: toLevel(course.level),
    coverTone: coverToneFor(course.id),
  };
}

/**
 * One list: per track in TRACK_IDS order, that track's lessons (input order)
 * then its courses; untracked lessons and courses last.
 */
export function buildLearnCatalog(
  items: PublicCatalogItem[],
  courses: PublicCourse[],
  locale: 'en' | 'ja',
): LearnCatalogEntry[] {
  const lessons = items.map((i) => fromLesson(i, locale));
  const courseEntries = courses.map((c) => fromCourse(c, locale));
  const groups: (TrackId | null)[] = [...TRACK_IDS, null];
  return groups.flatMap((track) => [
    ...lessons.filter((e) => e.track === track),
    ...courseEntries.filter((e) => e.track === track),
  ]);
}

/** NFKC, trim, collapse whitespace, lowercase, max 100 chars. */
export function normalizeQuery(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .slice(0, MAX_QUERY_LENGTH)
    .trim();
}

/** Track, free and text filters combined with AND. Plain substring match, never RegExp. */
export function filterCatalog(
  entries: LearnCatalogEntry[],
  state: CatalogState,
  trackLabel: (t: TrackId) => string,
): LearnCatalogEntry[] {
  const query = normalizeQuery(state.query);
  return entries.filter((e) => {
    if (state.track !== 'all' && e.track !== state.track) return false;
    if (state.freeOnly && !e.free) return false;
    if (!query) return true;
    const haystack = [e.title, e.blurb, e.track ? trackLabel(e.track) : '']
      .map(normalizeQuery)
      .join('\n');
    return haystack.includes(query);
  });
}

/** Reads `?track=&q=&free=1`; anything invalid falls back to the default. */
export function parseCatalogParams(search: string): CatalogState {
  const params = new URLSearchParams(search);
  const track = params.get('track');
  return {
    track: isTrackId(track) ? track : 'all',
    query: normalizeQuery(params.get('q') ?? ''),
    freeOnly: params.get('free') === '1',
  };
}

/** '' for the default state, else '?…' with no empty keys. */
export function serializeCatalogParams(state: CatalogState): string {
  const params = new URLSearchParams();
  if (state.track !== 'all') params.set('track', state.track);
  const query = normalizeQuery(state.query);
  if (query) params.set('q', query);
  if (state.freeOnly) params.set('free', '1');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** Free feature card: free ai_essentials lesson, else featured free, else first free. */
export function pickFreeFeature(entries: LearnCatalogEntry[]): LearnCatalogEntry | null {
  const free = entries.filter((e) => e.kind === 'lesson' && e.free);
  return (
    free.find((e) => e.track === 'ai_essentials') ??
    free.find((e) => e.featured) ??
    free[0] ??
    null
  );
}

/** Hot topics: lessons only, featured first, then newest publishedAt (nulls last). */
export function pickHotTopics(entries: LearnCatalogEntry[], n: number): LearnCatalogEntry[] {
  return entries
    .filter((e) => e.kind === 'lesson')
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      if (a.e.featured !== b.e.featured) return a.e.featured ? -1 : 1;
      const at = a.e.publishedAt;
      const bt = b.e.publishedAt;
      if (at !== bt) {
        if (at === null) return 1;
        if (bt === null) return -1;
        return at < bt ? 1 : -1;
      }
      return a.i - b.i;
    })
    .slice(0, n)
    .map(({ e }) => e);
}
