import { describe, it, expect } from 'vitest';
import {
  mergePartnerCatalog,
  enrichWithEnrollment,
  PARTNER_ENROLLMENT_STATUSES,
  type PartnerCatalogItem,
  type PartnerCourseSummary,
  type RankedCourse,
} from '@/lib/partners/catalog';

function course(
  id: string,
  overrides: Partial<PartnerCourseSummary> = {},
): PartnerCourseSummary {
  return {
    id,
    slug: `slug-${id}`,
    title_en: `Course ${id}`,
    title_jp: null,
    description_en: null,
    description_jp: null,
    thumbnail_url: null,
    level: null,
    total_weeks: null,
    language: 'en',
    ...overrides,
  };
}

function featuredRow(id: string, displayOrder: number | null, o = {}): RankedCourse {
  return { course: course(id, o), displayOrder, featured: true };
}

function ownedRow(id: string, o = {}): RankedCourse {
  return { course: course(id, o), displayOrder: null, featured: false };
}

const ids = (items: { course: PartnerCourseSummary }[]) => items.map((i) => i.course.id);

describe('mergePartnerCatalog', () => {
  it('returns owned-only courses', () => {
    const { ranked, truncated } = mergePartnerCatalog([], [ownedRow('b'), ownedRow('a')], 'en');
    expect(ids(ranked).sort()).toEqual(['a', 'b']);
    expect(truncated).toBe(false);
  });

  it('returns featured-only courses in display_order', () => {
    const { ranked } = mergePartnerCatalog(
      [featuredRow('c', 2), featuredRow('a', 0), featuredRow('b', 1)],
      [],
      'en',
    );
    expect(ids(ranked)).toEqual(['a', 'b', 'c']);
  });

  it('dedupes a course that is both owned and featured, keeping featured order', () => {
    const { ranked } = mergePartnerCatalog(
      [featuredRow('dup', 0)],
      [ownedRow('dup'), ownedRow('other')],
      'en',
    );
    expect(ids(ranked)).toEqual(['dup', 'other']);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].displayOrder).toBe(0);
    expect(ranked[0].featured).toBe(true);
  });

  it('ranks a NULL display_order featured row after numbered featured but before owned-only', () => {
    const { ranked } = mergePartnerCatalog(
      [featuredRow('numbered', 0), featuredRow('nullorder', null)],
      [ownedRow('owned')],
      'en',
    );
    expect(ids(ranked)).toEqual(['numbered', 'nullorder', 'owned']);
  });

  it('places all owned-only after all featured', () => {
    const { ranked } = mergePartnerCatalog(
      [featuredRow('f', 9)],
      [ownedRow('a'), ownedRow('b')],
      'en',
    );
    expect(ids(ranked)).toEqual(['f', 'a', 'b']);
  });

  it('breaks ties by title, then by id', () => {
    const { ranked } = mergePartnerCatalog(
      [],
      [
        ownedRow('z', { title_en: 'Same' }),
        ownedRow('a', { title_en: 'Same' }),
        ownedRow('m', { title_en: 'Aardvark' }),
      ],
      'en',
    );
    expect(ids(ranked)).toEqual(['m', 'a', 'z']);
  });

  it('sorts by the locale title on /ja, falling back to title_en', () => {
    const { ranked } = mergePartnerCatalog(
      [],
      [
        ownedRow('x', { title_en: 'Alpha', title_jp: 'んご' }),
        ownedRow('y', { title_en: 'Beta', title_jp: 'あい' }),
      ],
      'ja',
    );
    expect(ids(ranked)).toEqual(['y', 'x']);
  });

  it('caps at 50 and reports truncation only above 50', () => {
    const fifty = Array.from({ length: 50 }, (_, i) => ownedRow(`c${String(i).padStart(3, '0')}`));
    const exact = mergePartnerCatalog([], fifty, 'en');
    expect(exact.ranked).toHaveLength(50);
    expect(exact.truncated).toBe(false);

    const overflow = mergePartnerCatalog([], [...fifty, ownedRow('c050')], 'en');
    expect(overflow.ranked).toHaveLength(50);
    expect(overflow.truncated).toBe(true);
  });

  it('does not count a duplicate toward the cap', () => {
    const fifty = Array.from({ length: 50 }, (_, i) => ownedRow(`c${String(i).padStart(3, '0')}`));
    const { ranked, truncated } = mergePartnerCatalog([featuredRow('c000', 0)], fifty, 'en');
    expect(ranked).toHaveLength(50);
    expect(truncated).toBe(false);
  });
});

describe('enrichWithEnrollment', () => {
  const items: PartnerCatalogItem[] = [
    { course: course('active'), displayOrder: 0, enrollment: { state: 'unknown' } },
    { course: course('done'), displayOrder: 1, enrollment: { state: 'unknown' } },
    { course: course('none'), displayOrder: 2, enrollment: { state: 'unknown' } },
  ];
  const enrollments = [
    { course_id: 'active', status: 'active' },
    { course_id: 'done', status: 'completed' },
  ];
  const progress = new Map([
    ['active', 42],
    ['done', 17],
  ]);

  it('maps active, completed and not-enrolled', () => {
    const result = enrichWithEnrollment(items, enrollments, progress, true);
    expect(result[0].enrollment).toEqual({ state: 'active', progressPercent: 42 });
    expect(result[1].enrollment).toEqual({ state: 'completed', progressPercent: 100 });
    expect(result[2].enrollment).toEqual({ state: 'not_enrolled' });
  });

  it('renders completed as 100 even when the progress map disagrees', () => {
    const result = enrichWithEnrollment(items, enrollments, progress, true);
    expect(result[1].enrollment).toMatchObject({ progressPercent: 100 });
  });

  it('defaults a missing progress entry to 0 rather than dropping the card', () => {
    const result = enrichWithEnrollment(items, enrollments, new Map(), true);
    expect(result[0].enrollment).toEqual({ state: 'active', progressPercent: 0 });
  });

  it('maps EVERY item to unknown when the dashboard bundle failed', () => {
    const result = enrichWithEnrollment(items, enrollments, progress, false);
    expect(result.map((i) => i.enrollment.state)).toEqual(['unknown', 'unknown', 'unknown']);
  });

  it('never reports not_enrolled when unavailable, even for a genuinely unenrolled course', () => {
    // The regression this union exists to prevent: "View course" shown to a
    // paying member after a transient failure.
    const result = enrichWithEnrollment(items, [], new Map(), false);
    expect(result.every((i) => i.enrollment.state === 'unknown')).toBe(true);
  });

  it('requests completed enrollments, or the completed state is unreachable', () => {
    // The dashboard bundle is active-only (getUserEnrollments defaults to
    // ['active']). If the partner path ever narrows back to that, a member who
    // finished a partner course silently gets "View course" instead of
    // "Review" — the exact regression the enrollment union exists to prevent.
    expect(PARTNER_ENROLLMENT_STATUSES).toContain('completed');
    expect(PARTNER_ENROLLMENT_STATUSES).toContain('active');
  });

  it('preserves order and displayOrder', () => {
    const result = enrichWithEnrollment(items, enrollments, progress, true);
    expect(ids(result)).toEqual(['active', 'done', 'none']);
    expect(result.map((i) => i.displayOrder)).toEqual([0, 1, 2]);
  });
});
