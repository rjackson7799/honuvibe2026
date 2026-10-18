import { describe, expect, it } from 'vitest';
import {
  buildLearnCatalog,
  DEFAULT_CATALOG_STATE,
  filterCatalog,
  normalizeQuery,
  parseCatalogParams,
  pickFreeFeature,
  pickHotTopics,
  serializeCatalogParams,
  type CatalogState,
  type LearnCatalogEntry,
} from '@/lib/learn/catalog';
import type { PublicCatalogItem } from '@/lib/vault/catalog';
import type { PublicCourse } from '@/lib/learn/public-courses';
import type { TrackId } from '@/lib/tracks';

function lesson(over: Partial<PublicCatalogItem> = {}): PublicCatalogItem {
  return {
    id: 'l1',
    slug: 's1',
    title_en: 'Lesson one',
    title_jp: null,
    description_en: 'A lesson',
    description_jp: null,
    content_type: 'video',
    thumbnail_url: null,
    duration_minutes: null,
    difficulty_level: null,
    language: 'en',
    access_tier: 'premium',
    track: 'ai_essentials',
    is_featured: false,
    publish_date: null,
    series_id: null,
    series_order: null,
    ...over,
  };
}

function course(over: Partial<PublicCourse> = {}): PublicCourse {
  return {
    id: 'c-1',
    slug: 'c1',
    title_en: 'Course one',
    title_jp: null,
    description_en: 'A course',
    description_jp: null,
    level: null,
    language: 'en',
    total_weeks: null,
    thumbnail_url: null,
    price_usd: 100,
    price_jpy: 15000,
    is_featured: false,
    created_at: '2026-01-01T00:00:00Z',
    track: 'ai_essentials',
    vault_included: false,
    ...over,
  };
}

function entry(over: Partial<LearnCatalogEntry> = {}): LearnCatalogEntry {
  return {
    kind: 'lesson',
    id: 'e1',
    href: '/learn/vault/e1',
    title: 'Entry',
    blurb: '',
    track: 'ai_essentials',
    free: false,
    featured: false,
    publishedAt: null,
    meta: null,
    level: null,
    coverTone: 0,
    ...over,
  };
}

const LABELS: Record<TrackId, string> = {
  ai_essentials: 'AI Essentials',
  marketing_growth: 'Marketing & Growth',
  build_with_ai: 'Build with AI',
  research_insights: 'Research & Insights',
  workflow_automation: 'Workflow Automation',
};
const trackLabel = (t: TrackId) => LABELS[t];

describe('buildLearnCatalog', () => {
  it('maps a lesson to a vault href and free from access_tier', () => {
    const [premium, free] = buildLearnCatalog(
      [lesson(), lesson({ id: 'l2', slug: 's2', access_tier: 'free' })],
      [],
      'en',
    );
    expect(premium).toMatchObject({ kind: 'lesson', href: '/learn/vault/s1', free: false });
    expect(free).toMatchObject({ href: '/learn/vault/s2', free: true });
  });

  it('maps a course to /learn/<slug>, free only when both prices are 0', () => {
    const [paid, freeCourse, halfFree] = buildLearnCatalog(
      [],
      [
        course(),
        course({ id: 'c-2', slug: 'c2', price_usd: 0, price_jpy: 0 }),
        course({ id: 'c-3', slug: 'c3', price_usd: 0, price_jpy: 1000 }),
      ],
      'en',
    );
    expect(paid).toMatchObject({ kind: 'course', href: '/learn/c1', free: false });
    expect(freeCourse.free).toBe(true);
    expect(halfFree.free).toBe(false);
  });

  it('uses JA fields on ja and falls back to EN when they are null', () => {
    const [ja, fallback] = buildLearnCatalog(
      [
        lesson({ title_jp: 'レッスン', description_jp: '説明' }),
        lesson({ id: 'l2', slug: 's2', title_en: 'EN only', description_en: 'EN blurb' }),
      ],
      [],
      'ja',
    );
    expect(ja).toMatchObject({ title: 'レッスン', blurb: '説明' });
    expect(fallback).toMatchObject({ title: 'EN only', blurb: 'EN blurb' });
  });

  it('places courses after the lessons of the same track, untracked entries last', () => {
    const out = buildLearnCatalog(
      [
        lesson({ id: 'a', track: 'ai_essentials' }),
        lesson({ id: 'b', track: 'marketing_growth' }),
        lesson({ id: 'u', track: null }),
      ],
      [
        course({ id: 'cu', track: null }),
        course({ id: 'cm', track: 'marketing_growth' }),
        course({ id: 'ca', track: 'ai_essentials' }),
      ],
      'en',
    );
    expect(out.map((e) => e.id)).toEqual(['a', 'ca', 'b', 'cm', 'u', 'cu']);
  });

  it('builds meta from duration, content type, or weeks', () => {
    const out = buildLearnCatalog(
      [lesson({ id: 'm', duration_minutes: 12 }), lesson({ id: 't', content_type: 'video' })],
      [course({ id: 'w', total_weeks: 4 }), course({ id: 'n', total_weeks: null })],
      'en',
    );
    const byId = Object.fromEntries(out.map((e) => [e.id, e.meta]));
    expect(byId.m).toEqual({ kind: 'minutes', value: 12 });
    expect(byId.t).toEqual({ kind: 'type', value: 'video' });
    expect(byId.w).toEqual({ kind: 'weeks', value: 4 });
    expect(byId.n).toBeNull();
  });

  it('keeps known levels, nulls unknown ones, and gives a stable cover tone', () => {
    const items = [
      lesson({ id: 'k', difficulty_level: 'intermediate' }),
      lesson({ id: 'x', difficulty_level: 'expert' as never }),
    ];
    const first = buildLearnCatalog(items, [], 'en');
    const second = buildLearnCatalog(items, [], 'en');
    expect(first[0].level).toBe('intermediate');
    expect(first[1].level).toBeNull();
    expect(first[0].coverTone).toBe(second[0].coverTone);
    expect(first[0].coverTone).toBeGreaterThanOrEqual(0);
    expect(first[0].coverTone).toBeLessThan(6);
  });
});

describe('normalizeQuery', () => {
  it('trims, collapses spaces and lowercases', () => {
    expect(normalizeQuery('  Second   BRAIN ')).toBe('second brain');
  });
  it('NFKC-normalises full-width characters', () => {
    expect(normalizeQuery('ＡＩ')).toBe('ai');
  });
  it('caps at 100 characters', () => {
    expect(normalizeQuery('a'.repeat(500))).toHaveLength(100);
  });
  it('returns empty for whitespace only', () => {
    expect(normalizeQuery('   ')).toBe('');
  });
});

describe('filterCatalog', () => {
  const entries = [
    entry({ id: 'ess', title: 'Prompt basics', track: 'ai_essentials', free: true }),
    entry({ id: 'mkt', title: 'SEO with AI', blurb: 'Rank higher', track: 'marketing_growth' }),
    entry({ id: 'bld', title: 'Ship an app', track: 'build_with_ai', free: true }),
  ];
  const state = (over: Partial<CatalogState>): CatalogState => ({ ...DEFAULT_CATALOG_STATE, ...over });
  const ids = (s: CatalogState) => filterCatalog(entries, s, trackLabel).map((e) => e.id);

  it('filters by track', () => {
    expect(ids(state({ track: 'marketing_growth' }))).toEqual(['mkt']);
  });
  it('filters free only', () => {
    expect(ids(state({ freeOnly: true }))).toEqual(['ess', 'bld']);
  });
  it('matches title, blurb, or track label', () => {
    expect(ids(state({ query: 'seo' }))).toEqual(['mkt']);
    expect(ids(state({ query: 'rank' }))).toEqual(['mkt']);
    expect(ids(state({ query: 'essentials' }))).toEqual(['ess']);
  });
  it('treats regex metacharacters literally', () => {
    expect(() => ids(state({ query: 'c++ (beta)' }))).not.toThrow();
    expect(ids(state({ query: 'c++ (beta)' }))).toEqual([]);
  });
  it('applies no text filter for an empty query', () => {
    expect(ids(state({ query: '' }))).toEqual(['ess', 'mkt', 'bld']);
  });
  it('combines filters with AND', () => {
    expect(ids(state({ freeOnly: true, query: 'ship' }))).toEqual(['bld']);
    expect(ids(state({ freeOnly: true, track: 'marketing_growth' }))).toEqual([]);
  });
});

describe('parseCatalogParams / serializeCatalogParams', () => {
  it('parses all three params', () => {
    expect(parseCatalogParams('?track=marketing_growth&q=seo&free=1')).toEqual({
      track: 'marketing_growth',
      query: 'seo',
      freeOnly: true,
    });
  });
  it('falls back to all tracks for an unknown track', () => {
    expect(parseCatalogParams('?track=nope').track).toBe('all');
  });
  it('returns defaults for an empty search', () => {
    expect(parseCatalogParams('')).toEqual(DEFAULT_CATALOG_STATE);
  });
  it('normalises q', () => {
    expect(parseCatalogParams('?q=%20%20SEO%20%20Tips').query).toBe('seo tips');
  });
  it('serialises defaults to an empty string', () => {
    expect(serializeCatalogParams(DEFAULT_CATALOG_STATE)).toBe('');
  });
  it('round-trips', () => {
    const states: CatalogState[] = [
      { track: 'build_with_ai', query: '', freeOnly: false },
      { track: 'all', query: 'second brain', freeOnly: true },
      { track: 'research_insights', query: 'c++ & co', freeOnly: true },
    ];
    for (const s of states) {
      const qs = serializeCatalogParams(s);
      expect(qs.startsWith('?')).toBe(true);
      expect(parseCatalogParams(qs)).toEqual(s);
    }
  });
});

describe('pickFreeFeature', () => {
  it('prefers a free ai_essentials lesson', () => {
    const out = pickFreeFeature([
      entry({ id: 'f', free: true, featured: true, track: 'marketing_growth' }),
      entry({ id: 'e', free: true, track: 'ai_essentials' }),
    ]);
    expect(out?.id).toBe('e');
  });
  it('then a featured free lesson, then the first free lesson', () => {
    expect(
      pickFreeFeature([
        entry({ id: 'a', free: true, track: 'build_with_ai' }),
        entry({ id: 'b', free: true, featured: true, track: 'marketing_growth' }),
      ])?.id,
    ).toBe('b');
    expect(
      pickFreeFeature([
        entry({ id: 'a', free: true, track: 'build_with_ai' }),
        entry({ id: 'b', free: true, track: 'marketing_growth' }),
      ])?.id,
    ).toBe('a');
  });
  it('ignores courses and returns null when there is no free lesson', () => {
    expect(pickFreeFeature([entry({ kind: 'course', free: true }), entry({ free: false })])).toBeNull();
  });
});

describe('pickHotTopics', () => {
  it('returns lessons only, featured first then newest, nulls last, at most n', () => {
    const out = pickHotTopics(
      [
        entry({ id: 'old', publishedAt: '2026-01-01' }),
        entry({ id: 'none', publishedAt: null }),
        entry({ id: 'course', kind: 'course', featured: true, publishedAt: '2026-09-01' }),
        entry({ id: 'new', publishedAt: '2026-03-01' }),
        entry({ id: 'feat', featured: true, publishedAt: '2025-01-01' }),
        entry({ id: 'mid', publishedAt: '2026-02-01' }),
      ],
      4,
    );
    expect(out.map((e) => e.id)).toEqual(['feat', 'new', 'mid', 'old']);
  });
});
