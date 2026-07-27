import type { SupabaseClient } from '@supabase/supabase-js';
import type { Course } from '@/lib/courses/types';
import type { Locale } from './active-partner';

/** Exactly the columns a rail card renders. */
export type PartnerCourseSummary = Pick<
  Course,
  | 'id'
  | 'slug'
  | 'title_en'
  | 'title_jp'
  | 'description_en'
  | 'description_jp'
  | 'thumbnail_url'
  | 'level'
  | 'total_weeks'
  | 'language'
>;

const COURSE_COLUMNS =
  'id, slug, title_en, title_jp, description_en, description_jp, thumbnail_url, level, total_weeks, language';

/**
 * Merge, dedup and sort happen in JS, so each source only needs a deterministic
 * 51-row prefix. The 51st row is what distinguishes "exactly 50" from "more
 * than 50" — `.limit(50)` alone cannot.
 */
const SOURCE_LIMIT = 51;
const MAX_ITEMS = 50;

/**
 * The rail must distinguish "completed" from "never enrolled", so it cannot use
 * the dashboard bundle's enrollments: `getUserEnrollments` defaults to
 * `['active']` (lib/enrollments/queries.ts:11-13), which drops completed rows
 * entirely and would render "View course" to a member who finished the course.
 *
 * Widening the bundle itself is not an option — it feeds My Courses and
 * `showMyCourses`, so it would change the dashboard for non-partner members too.
 */
export const PARTNER_ENROLLMENT_STATUSES = ['active', 'completed'] as const;

/**
 * Discriminated so the dangerous case is unrepresentable. With `enrollment: null`
 * plus a separate `available` flag, "not enrolled" and "we don't know" collapse
 * into one value and a card can silently offer "View course" to a paying member
 * after a failed lookup.
 */
export type PartnerCatalogEnrollment =
  | { state: 'active'; progressPercent: number }
  | { state: 'completed'; progressPercent: 100 }
  | { state: 'not_enrolled' }
  | { state: 'unknown' };

export type PartnerCatalogItem = {
  course: PartnerCourseSummary;
  /** From `partner_courses`. Null means owned-only (no featured row). */
  displayOrder: number | null;
  enrollment: PartnerCatalogEnrollment;
};

export type PartnerCatalogResult =
  | { status: 'ok'; items: PartnerCatalogItem[]; truncated: boolean }
  | { status: 'partial'; items: PartnerCatalogItem[]; truncated: boolean }
  | { status: 'error'; items: [] };

type RankedCourse = {
  course: PartnerCourseSummary;
  displayOrder: number | null;
  /** Featured membership = a `partner_courses` row exists, NOT display_order != null. */
  featured: boolean;
};

function normalizeEmbed<T>(raw: unknown): T | null {
  return (Array.isArray(raw) ? raw[0] ?? null : raw ?? null) as T | null;
}

/**
 * Featured before owned-only; within featured, numbered before NULL
 * `display_order`; then locale-aware title; then id as a final deterministic
 * tiebreak.
 */
export function mergePartnerCatalog(
  featured: RankedCourse[],
  owned: RankedCourse[],
  locale: Locale,
): { ranked: RankedCourse[]; truncated: boolean } {
  const byId = new Map<string, RankedCourse>();

  // Featured first so "owned wins" governs row identity only — both sides
  // reference the same courses row, and a course that is both keeps its featured
  // display_order, the only explicit ordering signal a partner admin has.
  for (const row of featured) byId.set(row.course.id, row);
  for (const row of owned) {
    if (!byId.has(row.course.id)) byId.set(row.course.id, row);
  }

  const titleOf = (c: PartnerCourseSummary) =>
    locale === 'ja' && c.title_jp ? c.title_jp : c.title_en;

  const ranked = [...byId.values()].sort((a, b) => {
    const groupA = a.featured ? 0 : 1;
    const groupB = b.featured ? 0 : 1;
    if (groupA !== groupB) return groupA - groupB;

    if (a.featured && b.featured) {
      const orderA = a.displayOrder ?? Number.POSITIVE_INFINITY;
      const orderB = b.displayOrder ?? Number.POSITIVE_INFINITY;
      if (orderA !== orderB) return orderA - orderB;
    }

    const byTitle = titleOf(a.course).localeCompare(titleOf(b.course), locale);
    if (byTitle !== 0) return byTitle;

    return a.course.id.localeCompare(b.course.id);
  });

  return { ranked: ranked.slice(0, MAX_ITEMS), truncated: ranked.length > MAX_ITEMS };
}

/**
 * Maps the already-loaded dashboard bundle onto the catalog. Pure — the catalog
 * queries issue no enrollment or progress reads of their own.
 *
 * `available = false` means the dashboard bundle failed, so every card becomes
 * `unknown` rather than claiming "not enrolled" to a paying member.
 */
export function enrichWithEnrollment(
  items: readonly PartnerCatalogItem[],
  enrollments: ReadonlyArray<{ course_id: string; status: string }>,
  progress: ReadonlyMap<string, number>,
  available: boolean,
): PartnerCatalogItem[] {
  return items.map(({ course, displayOrder }) => {
    if (!available) {
      return { course, displayOrder, enrollment: { state: 'unknown' as const } };
    }

    const enrollment = enrollments.find((e) => e.course_id === course.id);
    if (!enrollment) {
      return { course, displayOrder, enrollment: { state: 'not_enrolled' as const } };
    }
    if (enrollment.status === 'completed') {
      // 100 rather than the computed percent, matching dashboard/courses/page.tsx:67.
      return {
        course,
        displayOrder,
        enrollment: { state: 'completed' as const, progressPercent: 100 as const },
      };
    }
    return {
      course,
      displayOrder,
      enrollment: {
        state: 'active' as const,
        progressPercent: progress.get(course.id) ?? 0,
      },
    };
  });
}

/**
 * A partner's courses: owned (`courses.partner_id`) UNION featured
 * (`partner_courses`), published only.
 *
 * `is_private` is deliberately NOT filtered — it hides courses from public
 * catalog surfaces, and this one is auth- and membership-gated (D6).
 *
 * The two queries are issued and caught independently so one failing source
 * degrades to `partial` rather than taking the module down.
 */
export async function getPartnerCatalog(
  supabase: SupabaseClient,
  partnerId: string,
  locale: Locale,
): Promise<PartnerCatalogResult> {
  const featuredQuery = supabase
    .from('partner_courses')
    // !inner so an unpublished course EXCLUDES its parent row instead of
    // yielding a null embed the caller has to filter — which is what makes the
    // 51-row prefix meaningful.
    .select(`display_order, courses:course_id!inner(${COURSE_COLUMNS}, is_published)`)
    .eq('partner_id', partnerId)
    .eq('courses.is_published', true)
    .order('display_order', { ascending: true, nullsFirst: false })
    // partner_courses has a composite PK (partner_id, course_id) and no id column.
    .order('course_id', { ascending: true })
    .limit(SOURCE_LIMIT);

  const ownedQuery = supabase
    .from('courses')
    .select(COURSE_COLUMNS)
    .eq('partner_id', partnerId)
    .eq('is_published', true)
    // Deliberately title_en even on /ja: title_jp is nullable, so ordering by it
    // would scatter untranslated courses. This order only picks a deterministic
    // 51-row prefix; the user-visible order is the locale-aware sort above.
    .order('title_en', { ascending: true })
    .order('id', { ascending: true })
    .limit(SOURCE_LIMIT);

  const [featuredResult, ownedResult] = await Promise.all([
    Promise.resolve(featuredQuery).then(
      (r) => r,
      (e: unknown) => ({ data: null, error: { message: errorMessage(e) } }),
    ),
    Promise.resolve(ownedQuery).then(
      (r) => r,
      (e: unknown) => ({ data: null, error: { message: errorMessage(e) } }),
    ),
  ]);

  const featuredOk = !featuredResult.error;
  const ownedOk = !ownedResult.error;

  if (featuredResult.error) {
    console.error('[partners] partner catalog featured query failed:', featuredResult.error.message);
  }
  if (ownedResult.error) {
    console.error('[partners] partner catalog owned query failed:', ownedResult.error.message);
  }

  if (!featuredOk && !ownedOk) return { status: 'error', items: [] };

  const featured: RankedCourse[] = ((featuredResult.data ?? []) as unknown[])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const course = normalizeEmbed<PartnerCourseSummary>(record.courses);
      if (!course) return null;
      const rawOrder = record.display_order;
      return {
        course,
        displayOrder: typeof rawOrder === 'number' ? rawOrder : null,
        featured: true,
      };
    })
    .filter((r): r is RankedCourse => r !== null);

  const owned: RankedCourse[] = ((ownedResult.data ?? []) as unknown[]).map((row) => ({
    course: row as PartnerCourseSummary,
    displayOrder: null,
    featured: false,
  }));

  const { ranked, truncated } = mergePartnerCatalog(featured, owned, locale);

  if (truncated) {
    // Partner id (an opaque UUID), never the slug. Counts are RETURNED rows,
    // capped at 51 — not true database totals.
    console.warn(
      `[partners] partner catalog truncated to ${MAX_ITEMS}: partner=${partnerId} featuredReturned=${featured.length} ownedReturned=${owned.length}`,
    );
  }

  // Enrollment is layered on by the page via enrichWithEnrollment; until then
  // every item is unknown rather than a claim we have not checked.
  const items: PartnerCatalogItem[] = ranked.map(({ course, displayOrder }) => ({
    course,
    displayOrder,
    enrollment: { state: 'unknown' },
  }));

  // A surviving source returning ZERO rows is still `partial`, never `ok` — the
  // module must render failure copy, not coming-soon copy.
  return { status: featuredOk && ownedOk ? 'ok' : 'partial', items, truncated };
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Exported for the pure merge tests; not part of the page-facing surface. */
export type { RankedCourse };
