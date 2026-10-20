import { describe, it, expect } from 'vitest';
import { resolveCourseCta, isFreeCourse, type CourseCtaInput } from '@/lib/learn/course-cta';

const NOW = new Date('2026-10-19T00:00:00Z');
const PAST = '2026-04-09T00:00:00Z';
const FUTURE = '2026-12-01T00:00:00Z';
const SUBSCRIBE = '/api/stripe/subscribe?tier=vault';

type CourseIn = CourseCtaInput['course'];

function input(
  course: Partial<CourseIn> = {},
  rest: Partial<Omit<CourseCtaInput, 'course'>> = {},
): CourseCtaInput {
  return {
    slug: 's1',
    locale: 'en',
    signedIn: false,
    accessSource: null,
    now: NOW,
    course: {
      course_type: 'cohort',
      status: 'published',
      vault_included: false,
      start_date: FUTURE,
      max_enrollment: 15,
      current_enrollment: 2,
      price_usd: 125000,
      price_jpy: 0,
      ...course,
    },
    ...rest,
  };
}

const included: Partial<CourseIn> = { course_type: 'self-study', vault_included: true, start_date: null };

describe('resolveCourseCta', () => {
  it('R1 signed-out on an included course → join_vault', () => {
    expect(resolveCourseCta(input(included))).toEqual({
      kind: 'join_vault',
      href: SUBSCRIBE,
      plainAnchor: true,
      priceCard: 'vault_join',
      navCta: 'join_vault',
    });
  });

  it('R1 on /ja appends locale=ja', () => {
    expect(resolveCourseCta(input(included, { locale: 'ja' })).href).toBe(
      `${SUBSCRIBE}&locale=ja`,
    );
  });

  it('R2 signed-in, no access, included → join_vault', () => {
    expect(resolveCourseCta(input(included, { signedIn: true }))).toEqual({
      kind: 'join_vault',
      href: SUBSCRIBE,
      plainAnchor: true,
      priceCard: 'vault_join',
      navCta: 'join_vault',
    });
  });

  it('R2 included + full + no access → join_vault (capacity ignored)', () => {
    const cta = resolveCourseCta(
      input({ ...included, max_enrollment: 2, current_enrollment: 2 }, { signedIn: true }),
    );
    expect(cta.kind).toBe('join_vault');
  });

  it('R3 vault reader → open_vault', () => {
    expect(
      resolveCourseCta(input(included, { signedIn: true, accessSource: 'vault' })),
    ).toEqual({
      kind: 'open_vault',
      href: '/learn/dashboard/s1',
      plainAnchor: false,
      priceCard: 'vault_member',
      navCta: null,
    });
  });

  it('R4 enrolled → open_enrolled', () => {
    expect(resolveCourseCta(input({}, { signedIn: true, accessSource: 'enrollment' }))).toEqual({
      kind: 'open_enrolled',
      href: '/learn/dashboard/s1',
      plainAnchor: false,
      priceCard: 'enrolled',
      navCta: null,
    });
  });

  it('R4 enrolled on a full, started cohort → open_enrolled', () => {
    const cta = resolveCourseCta(
      input(
        { start_date: PAST, status: 'in-progress', max_enrollment: 2, current_enrollment: 2 },
        { signedIn: true, accessSource: 'enrollment' },
      ),
    );
    expect(cta.kind).toBe('open_enrolled');
  });

  it('R5 enrolled and included → open_enrolled', () => {
    const cta = resolveCourseCta(input(included, { signedIn: true, accessSource: 'enrollment' }));
    expect(cta).toMatchObject({ kind: 'open_enrolled', priceCard: 'enrolled', navCta: null });
  });

  it('R6 1v1 without access → contact', () => {
    expect(
      resolveCourseCta(input({ course_type: '1v1', price_usd: null, price_jpy: null, start_date: null })),
    ).toEqual({
      kind: 'contact',
      href: '/contact',
      plainAnchor: false,
      priceCard: 'contact',
      navCta: null,
    });
  });

  it('R6 1v1 with an enrollment → open_enrolled', () => {
    const cta = resolveCourseCta(
      input({ course_type: '1v1' }, { signedIn: true, accessSource: 'enrollment' }),
    );
    expect(cta.kind).toBe('open_enrolled');
  });

  it('R7 started cohort → closed', () => {
    expect(resolveCourseCta(input({ start_date: PAST }))).toEqual({
      kind: 'closed',
      href: '#newsletter',
      plainAnchor: true,
      priceCard: 'course_price',
      navCta: null,
    });
  });

  it('R7 status in-progress closes even with a future date', () => {
    expect(resolveCourseCta(input({ status: 'in-progress' })).kind).toBe('closed');
  });

  it('R7 self-study with a past start_date is not closed', () => {
    const cta = resolveCourseCta(input({ course_type: 'self-study', start_date: PAST }));
    expect(cta.kind).toBe('buy');
  });

  it('R7 status completed closes a self-study course', () => {
    const cta = resolveCourseCta(input({ course_type: 'self-study', status: 'completed' }));
    expect(cta.kind).toBe('closed');
  });

  it('R8 full → #newsletter link, plainAnchor', () => {
    expect(resolveCourseCta(input({ max_enrollment: 2, current_enrollment: 2 }))).toEqual({
      kind: 'full',
      href: '#newsletter',
      plainAnchor: true,
      priceCard: 'course_price',
      navCta: null,
    });
  });

  it('R9 free, signed-out → enroll_free via signin', () => {
    expect(resolveCourseCta(input({ price_usd: 0, price_jpy: 0 }))).toEqual({
      kind: 'enroll_free',
      href: '/signin?redirect=%2Flearn%2Fs1',
      plainAnchor: false,
      priceCard: 'free',
      navCta: null,
    });
  });

  it('R9 usd 0 / jpy null is free', () => {
    expect(resolveCourseCta(input({ price_usd: 0, price_jpy: null })).kind).toBe('enroll_free');
  });

  it('R10 free, signed-in → enroll_free with no href (server action)', () => {
    expect(resolveCourseCta(input({ price_usd: 0, price_jpy: 0 }, { signedIn: true }))).toEqual({
      kind: 'enroll_free',
      href: null,
      plainAnchor: false,
      priceCard: 'free',
      navCta: null,
    });
  });

  it('R11a both prices null → contact', () => {
    expect(resolveCourseCta(input({ price_usd: null, price_jpy: null }))).toEqual({
      kind: 'contact',
      href: '/contact',
      plainAnchor: false,
      priceCard: 'contact',
      navCta: null,
    });
  });

  it('R11a (0, 2980) on EN → contact', () => {
    expect(resolveCourseCta(input({ price_usd: 0, price_jpy: 2980 })).kind).toBe('contact');
  });

  it('R11 paid, signed-out → buy via signin', () => {
    expect(resolveCourseCta(input())).toEqual({
      kind: 'buy',
      href: '/signin?redirect=%2Flearn%2Fs1',
      plainAnchor: false,
      priceCard: 'course_price',
      navCta: null,
    });
  });

  it('signin redirect encodes /ja/learn/<slug> on JA', () => {
    expect(resolveCourseCta(input({}, { locale: 'ja' })).href).toBe(
      '/signin?redirect=%2Fja%2Flearn%2Fs1',
    );
  });

  it('R12 paid, signed-in → buy via checkout', () => {
    expect(resolveCourseCta(input({}, { signedIn: true }))).toEqual({
      kind: 'buy',
      href: '/learn/s1/checkout',
      plainAnchor: false,
      priceCard: 'course_price',
      navCta: null,
    });
  });

  it('R12 active Vault member on a non-included paid course → buy', () => {
    // hasCourseAccess returns no access for a member on a non-included course.
    const cta = resolveCourseCta(input({ vault_included: false }, { signedIn: true, accessSource: null }));
    expect(cta.kind).toBe('buy');
    expect(cta.navCta).toBeNull();
  });

  it('R12 (125000, 0) on JA → buy (USD fallback)', () => {
    expect(resolveCourseCta(input({}, { locale: 'ja', signedIn: true })).kind).toBe('buy');
  });
});

describe('isFreeCourse', () => {
  it('mirrors the 072 RPC', () => {
    expect(isFreeCourse(0, 0)).toBe(true);
    expect(isFreeCourse(0, null)).toBe(true);
    expect(isFreeCourse(null, 0)).toBe(true);
    expect(isFreeCourse(null, null)).toBe(false);
    expect(isFreeCourse(100, 0)).toBe(false);
    expect(isFreeCourse(0, 2980)).toBe(false);
  });
});
