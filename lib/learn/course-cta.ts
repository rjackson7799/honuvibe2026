// Course-detail CTA decision (Unit 2b, plan §3). First match wins, in this
// order: enrollment → Vault reader → included (Join the Vault) → 1v1 →
// closed → full → free → unpriced → paid. Pure; `now` is injected.
//
// hrefs for pages are unprefixed (rendered through next-intl's Link, which
// adds /ja); the signin `redirect=` value and the subscribe href carry the
// locale themselves.
import type { CourseStatus, CourseType } from '@/lib/courses/types';
import type { CourseAccess } from '@/lib/enrollments/types';
import { apiHrefForLocale, NAV_CTA_HREF } from '@/components/marketing/nav/nav-cta';
import { formatCoursePrice } from '@/lib/learn/course-detail';

export type CourseCtaKind =
  | 'join_vault'
  | 'open_vault'
  | 'open_enrolled'
  | 'contact'
  | 'closed'
  | 'full'
  | 'enroll_free'
  | 'buy';

export type PriceCardVariant =
  | 'vault_join'
  | 'vault_member'
  | 'enrolled'
  | 'course_price'
  | 'free'
  | 'contact';

export type CourseCta = {
  kind: CourseCtaKind;
  href: string | null;
  plainAnchor: boolean;
  priceCard: PriceCardVariant;
  navCta: 'join_vault' | null;
};

export type CourseCtaInput = {
  slug: string;
  locale: 'en' | 'ja';
  signedIn: boolean;
  accessSource: CourseAccess['source'];
  now: Date;
  course: {
    course_type: CourseType;
    status: CourseStatus;
    vault_included: boolean;
    start_date: string | null;
    max_enrollment: number | null;
    current_enrollment: number;
    price_usd: number | null;
    price_jpy: number | null;
  };
};

const NEWSLETTER_ANCHOR = '#newsletter';
const CLOSED_STATUSES: CourseStatus[] = ['in-progress', 'completed', 'archived'];

/** Mirrors the 072 `enroll_in_free_course` RPC: zero in both, not both null. */
export function isFreeCourse(priceUsd: number | null, priceJpy: number | null): boolean {
  if (priceUsd == null && priceJpy == null) return false;
  return (priceUsd ?? 0) === 0 && (priceJpy ?? 0) === 0;
}

function cta(
  kind: CourseCtaKind,
  href: string | null,
  priceCard: PriceCardVariant,
  extra: Partial<Pick<CourseCta, 'plainAnchor' | 'navCta'>> = {},
): CourseCta {
  return { kind, href, plainAnchor: false, priceCard, navCta: null, ...extra };
}

export function resolveCourseCta(input: CourseCtaInput): CourseCta {
  const { slug, locale, signedIn, accessSource, now, course } = input;
  const prefix = locale === 'ja' ? '/ja' : '';
  const hub = `/learn/dashboard/${slug}`;
  const signin = `/signin?redirect=${encodeURIComponent(`${prefix}/learn/${slug}`)}`;

  // R4/R5 — enrollment wins (B3 order), whatever the course state.
  if (accessSource === 'enrollment') return cta('open_enrolled', hub, 'enrolled');
  // R3
  if (accessSource === 'vault') return cta('open_vault', hub, 'vault_member');
  // R1/R2 — capacity and dates never block Vault access.
  if (course.vault_included) {
    return cta('join_vault', apiHrefForLocale(NAV_CTA_HREF.join_vault, locale), 'vault_join', {
      plainAnchor: true,
      navCta: 'join_vault',
    });
  }
  // R6
  if (course.course_type === '1v1') return cta('contact', '/contact', 'contact');
  // R7 — the date rule applies to cohorts only (D9).
  const started =
    course.course_type === 'cohort' &&
    course.start_date != null &&
    new Date(course.start_date) <= now;
  if (CLOSED_STATUSES.includes(course.status) || started) {
    return cta('closed', NEWSLETTER_ANCHOR, 'course_price', { plainAnchor: true });
  }
  // R8
  if (course.max_enrollment != null && course.current_enrollment >= course.max_enrollment) {
    return cta('full', NEWSLETTER_ANCHOR, 'course_price', { plainAnchor: true });
  }
  // R9/R10
  if (isFreeCourse(course.price_usd, course.price_jpy)) {
    return cta('enroll_free', signedIn ? null : signin, 'free');
  }
  // R11a — checkout bounces a course with no usable price in this locale.
  if (formatCoursePrice(course.price_usd, course.price_jpy, locale) === null) {
    return cta('contact', '/contact', 'contact');
  }
  // R11/R12
  return cta('buy', signedIn ? `/learn/${slug}/checkout` : signin, 'course_price');
}
