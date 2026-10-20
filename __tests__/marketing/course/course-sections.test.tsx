import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '@/messages/en.json';
import ja from '@/messages/ja.json';
import {
  CourseClosing,
  CourseCtaButton,
  CourseCurriculum,
  CourseFaq,
  CourseHero,
  CourseInstructors,
  CourseOutcomes,
  CourseOverview,
  CoursePriceCard,
  CourseSubnav,
  CourseSyllabus,
} from '@/components/marketing/course';
import { buildCourseDetailView, type CourseModuleView } from '@/lib/learn/course-detail';
import { resolveCourseCta, type CourseCta } from '@/lib/learn/course-cta';
import { makeCourse, makeOneOnOne, NOW } from '../../fixtures/course-detail';
import { stubMatchMedia } from '../hv/helpers';
import type { CourseWithCurriculum } from '@/lib/courses/types';

const push = vi.fn();
const refresh = vi.fn();
const simulatedEnroll = vi.fn();
const trackEnroll = vi.fn();
const trackJoin = vi.fn();

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} data-intl-link="true" {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock('@/lib/enrollments/actions', () => ({
  simulatedEnroll: (...args: unknown[]) => simulatedEnroll(...args),
}));
vi.mock('@/lib/analytics', () => ({
  trackCourseEnrollCtaClick: (...args: unknown[]) => trackEnroll(...args),
  trackCourseJoinVaultClick: (...args: unknown[]) => trackJoin(...args),
}));

function wrap(node: ReactNode, locale: 'en' | 'ja' = 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === 'ja' ? ja : en}>
      {node}
    </NextIntlClientProvider>,
  );
}

function setup(
  course: CourseWithCurriculum = makeCourse(),
  opts: { signedIn?: boolean; accessSource?: 'enrollment' | 'vault' | null; locale?: 'en' | 'ja' } = {},
) {
  const locale = opts.locale ?? 'en';
  const view = buildCourseDetailView(course, locale, NOW);
  const cta = resolveCourseCta({
    slug: course.slug,
    locale,
    signedIn: opts.signedIn ?? false,
    accessSource: opts.accessSource ?? null,
    now: NOW,
    course: {
      course_type: course.course_type,
      status: course.status,
      vault_included: course.vault_included === true,
      start_date: course.start_date,
      max_enrollment: course.max_enrollment,
      current_enrollment: course.current_enrollment,
      price_usd: course.price_usd,
      price_jpy: course.price_jpy,
    },
  });
  return { view, cta };
}

const INCLUDED = makeCourse({
  course_type: 'self-study',
  vault_included: true,
  start_date: null,
  live_sessions_count: 0,
});
const FUTURE = makeCourse({ start_date: '2026-12-01T00:00:00Z' });

beforeEach(() => {
  stubMatchMedia(false);
  push.mockReset();
  refresh.mockReset();
  simulatedEnroll.mockReset();
  trackEnroll.mockReset();
  trackJoin.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('CourseHero', () => {
  it('renders title, alt title, badges and facts', () => {
    const { view, cta } = setup();
    wrap(<CourseHero view={view} cta={cta} ctaLabel="Label" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('AI Essentials');
    expect(screen.getByText('AIエッセンシャルズ')).toBeInTheDocument();
    expect(screen.getByText('Beginner')).toBeInTheDocument();
    expect(screen.getAllByText('Live cohort').length).toBeGreaterThan(0);
    expect(screen.getByText('HV-AIE100')).toBeInTheDocument();

    const dl = document.querySelector('dl')!;
    const terms = within(dl as HTMLElement).getAllByRole('term').map((n) => n.textContent);
    const defs = within(dl as HTMLElement).getAllByRole('definition').map((n) => n.textContent);
    expect(terms).toEqual(['Format', 'Length', 'Language', 'Community']);
    expect(defs).toEqual(['Live cohort', '5 modules · ~5 hrs', 'EN / 日本語', '1 month']);
    expect(dl.textContent).not.toMatch(/certificate/i);
    expect(screen.getByRole('link', { name: /Download syllabus/ })).toHaveAttribute('href', '#syllabus');
  });

  it('hides Download syllabus without syllabus locales', () => {
    const { view, cta } = setup(makeOneOnOne());
    wrap(<CourseHero view={view} cta={cta} ctaLabel="Ask about 1-on-1" />);
    expect(screen.queryByText(/Download syllabus/)).toBeNull();
    // 1v1 nulls: no level/code badge, < 2 facts would hide the dl but format + language remain
    expect(screen.queryByText('Beginner')).toBeNull();
    expect(document.body.textContent).not.toMatch(/null|NaN|0 weeks/);
  });

  it('shows the partner badge', () => {
    const { view, cta } = setup(
      makeCourse({ partners: { slug: 'p', name_en: 'Acme', name_jp: null, logo_url: null } }),
    );
    wrap(<CourseHero view={view} cta={cta} ctaLabel="x" />);
    expect(screen.getByText('with Acme')).toBeInTheDocument();
  });
});

describe('CoursePriceCard', () => {
  it('vault_join shows $99 and a plain subscribe link', () => {
    const { view, cta } = setup(INCLUDED);
    wrap(<CoursePriceCard view={view} cta={cta} ctaLabel="Start learning in the Vault" />);
    expect(screen.getByText('$99')).toBeInTheDocument();
    const join = screen.getByRole('link', { name: 'Join the Vault' });
    expect(join).toHaveAttribute('href', '/api/stripe/subscribe?tier=vault');
    expect(join).not.toHaveAttribute('data-intl-link');
    expect(screen.getByRole('link', { name: /See what’s inside/ })).toHaveAttribute('href', '#curriculum');
  });

  it('See what’s inside uses an AA colour on the sand card (not terracotta, 3.86:1)', () => {
    const { view, cta } = setup(INCLUDED);
    wrap(<CoursePriceCard view={view} cta={cta} ctaLabel="x" />);
    const link = screen.getByRole('link', { name: /See what’s inside/ });
    expect(link.className).toContain('text-hv-green-900');
    expect(link.className).not.toMatch(/(^|\s)text-hv-terracotta(\s|$)/);
  });

  it('vault_member shows Included in your Vault and no price', () => {
    const { view, cta } = setup(INCLUDED, { signedIn: true, accessSource: 'vault' });
    const { container } = wrap(<CoursePriceCard view={view} cta={cta} ctaLabel="Open in your Vault" />);
    expect(screen.getByText('Included in your Vault')).toBeInTheDocument();
    expect(container.textContent).not.toContain('$');
    expect(screen.getByRole('link', { name: 'Open in your Vault' })).toHaveAttribute(
      'href',
      '/learn/dashboard/s1',
    );
  });

  it('course_price shows the price and the closed note for a started cohort', () => {
    const { view, cta } = setup();
    expect(cta.kind).toBe('closed');
    wrap(<CoursePriceCard view={view} cta={cta} ctaLabel="Get notified about the next cohort" />);
    expect(screen.getByText('$1,250')).toBeInTheDocument();
    expect(screen.getByText('This cohort is under way. Enrollment is closed.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get notified about the next cohort' })).toHaveAttribute(
      'href',
      '#newsletter',
    );
  });

  it('course_price on a future cohort shows starts and spots', () => {
    const { view, cta } = setup(makeCourse({ start_date: '2026-12-01T00:00:00Z', current_enrollment: 12 }));
    wrap(<CoursePriceCard view={view} cta={cta} ctaLabel="Enroll — $1,250" />);
    expect(screen.getByText('Starts Dec 1, 2026')).toBeInTheDocument();
    expect(screen.getByText('3 spots left')).toBeInTheDocument();
    expect(screen.getByText('one-time')).toBeInTheDocument();
  });

  it('free', () => {
    const { view, cta } = setup(makeCourse({ price_usd: 0, price_jpy: 0, start_date: null }));
    wrap(<CoursePriceCard view={view} cta={cta} ctaLabel="Enroll free" />);
    expect(screen.getByText('Free course')).toBeInTheDocument();
    expect(screen.getByText('Create a free account and enroll.')).toBeInTheDocument();
  });

  it('contact with 1v1 copy', () => {
    const { view, cta } = setup(makeOneOnOne());
    wrap(<CoursePriceCard view={view} cta={cta} ctaLabel="Ask about 1-on-1" />);
    expect(screen.getByText('1-on-1 program')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ask about 1-on-1' })).toHaveAttribute('href', '/contact');
  });

  it('contact with generic copy', () => {
    const { view, cta } = setup(makeCourse({ price_usd: null, price_jpy: null, start_date: null }));
    wrap(<CoursePriceCard view={view} cta={cta} ctaLabel="Ask about this course" />);
    expect(screen.getByText('Get in touch and we’ll tell you how to join.')).toBeInTheDocument();
  });

  it('enrolled', () => {
    const { view, cta } = setup(makeCourse(), { signedIn: true, accessSource: 'enrollment' });
    wrap(<CoursePriceCard view={view} cta={cta} ctaLabel="Go to your course" />);
    expect(screen.getByText('You’re enrolled')).toBeInTheDocument();
    expect(screen.queryByText('$1,250')).toBeNull();
  });

  it('renders the course image or a plain block', () => {
    const { view, cta } = setup();
    const { container, unmount } = wrap(<CoursePriceCard view={view} cta={cta} ctaLabel="x" />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://img.example/hero.png');
    unmount();
    const bare = setup(makeCourse({ hero_image_url: null }));
    const second = wrap(<CoursePriceCard view={bare.view} cta={bare.cta} ctaLabel="x" />);
    expect(second.container.querySelector('img')).toBeNull();
  });
});

describe('CourseCtaButton', () => {
  const freeCta: CourseCta = {
    kind: 'enroll_free',
    href: null,
    plainAnchor: false,
    priceCard: 'free',
    navCta: null,
  };

  it('enroll_free signed-in enrolls then pushes to the hub', async () => {
    simulatedEnroll.mockResolvedValue({ success: true });
    wrap(<CourseCtaButton cta={freeCta} label="Enroll free" courseId="c1" slug="s1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Enroll free' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/learn/dashboard/s1?enrolled=true'));
    expect(simulatedEnroll).toHaveBeenCalledWith('c1', 'en');
    expect(refresh).toHaveBeenCalled();
    expect(trackEnroll).toHaveBeenCalledWith({ course_slug: 's1', is_paid: false, locale: 'en' });
  });

  it('enroll_free on ja pushes /ja/learn/dashboard/… once', async () => {
    simulatedEnroll.mockResolvedValue({ success: true });
    wrap(<CourseCtaButton cta={freeCta} label="無料で受講する" courseId="c1" slug="s1" />, 'ja');
    fireEvent.click(screen.getByRole('button', { name: '無料で受講する' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/ja/learn/dashboard/s1?enrolled=true'));
    expect(simulatedEnroll).toHaveBeenCalledWith('c1', 'ja');
  });

  it('shows the error and re-enables on rejection', async () => {
    simulatedEnroll.mockRejectedValue(new Error('Course is full'));
    wrap(<CourseCtaButton cta={freeCta} label="Enroll free" courseId="c1" slug="s1" />);
    const button = screen.getByRole('button', { name: 'Enroll free' });
    fireEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We couldn’t enroll you. Please try again, or contact us.',
    );
    expect(screen.getByRole('button', { name: 'Enroll free' })).not.toBeDisabled();
    expect(push).not.toHaveBeenCalled();
  });

  it('full renders a link to #newsletter', () => {
    const cta: CourseCta = { kind: 'full', href: '#newsletter', plainAnchor: true, priceCard: 'course_price', navCta: null };
    wrap(<CourseCtaButton cta={cta} label="Cohort full — get notified" courseId="c1" slug="s1" />);
    const link = screen.getByRole('link', { name: 'Cohort full — get notified' });
    expect(link).toHaveAttribute('href', '#newsletter');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('join_vault on ja is a plain anchor ending locale=ja and is tracked', () => {
    const { cta } = setup(INCLUDED, { locale: 'ja' });
    wrap(<CourseCtaButton cta={cta} label="Vaultで学びはじめる" courseId="c1" slug="s1" />, 'ja');
    const link = screen.getByRole('link', { name: 'Vaultで学びはじめる' });
    expect(link.getAttribute('href')).toMatch(/locale=ja$/);
    expect(link).not.toHaveAttribute('data-intl-link');
    fireEvent.click(link);
    expect(trackJoin).toHaveBeenCalledWith({ course_slug: 's1', locale: 'ja' });
  });

  it('buy is tracked as paid', () => {
    const cta: CourseCta = { kind: 'buy', href: '/learn/s1/checkout', plainAnchor: false, priceCard: 'course_price', navCta: null };
    wrap(<CourseCtaButton cta={cta} label="Enroll — $1,250" courseId="c1" slug="s1" />);
    fireEvent.click(screen.getByRole('link', { name: 'Enroll — $1,250' }));
    expect(trackEnroll).toHaveBeenCalledWith({ course_slug: 's1', is_paid: true, locale: 'en' });
  });
});

describe('CourseCurriculum', () => {
  const modules = (course = makeCourse()) => buildCourseDetailView(course, 'en', NOW).modules;
  const headers = () =>
    screen.getAllByRole('button').filter((b) => b.hasAttribute('aria-controls'));

  it("'first' opens only module 1 and modules open independently", () => {
    wrap(<CourseCurriculum modules={modules()} curriculumOpen="first" heading="H" sub="S" showStage />);
    const hs = headers();
    expect(hs.map((h) => h.getAttribute('aria-expanded'))).toEqual(['true', 'false', 'false', 'false', 'false']);
    fireEvent.click(hs[1]);
    expect(hs[0]).toHaveAttribute('aria-expanded', 'true');
    expect(hs[1]).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(hs[1].getAttribute('aria-controls')!)!;
    expect(panel).not.toHaveAttribute('hidden');
  });

  it('Expand all opens every module and flips to Collapse all', () => {
    wrap(<CourseCurriculum modules={modules()} curriculumOpen="first" heading="H" sub="S" showStage />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));
    expect(headers().every((h) => h.getAttribute('aria-expanded') === 'true')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    expect(headers().every((h) => h.getAttribute('aria-expanded') === 'false')).toBe(true);
  });

  it("'none' and 'all'", () => {
    const { unmount } = wrap(
      <CourseCurriculum modules={modules()} curriculumOpen="none" heading="H" sub="S" showStage />,
    );
    expect(headers().every((h) => h.getAttribute('aria-expanded') === 'false')).toBe(true);
    unmount();
    wrap(<CourseCurriculum modules={modules()} curriculumOpen="all" heading="H" sub="S" showStage />);
    expect(headers().every((h) => h.getAttribute('aria-expanded') === 'true')).toBe(true);
    expect(screen.getByRole('button', { name: 'Collapse all' })).toBeInTheDocument();
  });

  it('shows stage, length, lessons, points and the practice task', () => {
    wrap(<CourseCurriculum modules={modules()} curriculumOpen="first" heading="Five" sub="Pace" showStage />);
    expect(screen.getByRole('heading', { level: 2, name: 'Five' })).toBeInTheDocument();
    expect(screen.getByText('Pace')).toBeInTheDocument();
    expect(screen.getByText('Module 1 · Stage 1')).toBeInTheDocument();
    expect(screen.getAllByText('1 lesson · ~60 min')).toHaveLength(5);
    expect(screen.getByText('Lesson 1.1')).toBeInTheDocument();
    expect(screen.getByText('Point 1a')).toBeInTheDocument();
    expect(screen.getByText('Task 1')).toBeInTheDocument();
  });

  it('omits the practice task row when task is null and tags free previews', () => {
    // One module only: closed panels stay in the DOM (hidden), and would carry their own task rows.
    const mods: CourseModuleView[] = modules()
      .slice(0, 1)
      .map((m) => ({ ...m, task: null, lessons: m.lessons.map((l) => ({ ...l, freePreview: true })) }));
    wrap(<CourseCurriculum modules={mods} curriculumOpen="first" heading="H" sub={null} showStage />);
    expect(screen.queryByText('Practice task')).toBeNull();
    expect(screen.getByText('Free preview')).toBeInTheDocument();
  });

  it('on ja hides the stage and labels by number (D13)', () => {
    const jaMods = buildCourseDetailView(makeCourse(), 'ja', NOW).modules;
    wrap(<CourseCurriculum modules={jaMods} curriculumOpen="first" heading="H" sub={null} showStage={false} />, 'ja');
    expect(screen.getByText('モジュール1')).toBeInTheDocument();
    expect(screen.queryByText(/Stage 1/)).toBeNull();
  });

  it('renders nothing without modules', () => {
    const { container } = wrap(
      <CourseCurriculum modules={[]} curriculumOpen="first" heading="H" sub={null} showStage />,
    );
    expect(container.querySelector('section')).toBeNull();
  });
});

describe('CourseSubnav', () => {
  it('renders nothing with fewer than 3 sections', () => {
    const { container } = wrap(
      <CourseSubnav sections={[{ id: 'overview', label: 'Overview' }, { id: 'faq', label: 'FAQ' }]} />,
    );
    expect(container.querySelector('nav')).toBeNull();
  });

  it('renders one #link per section', () => {
    wrap(
      <CourseSubnav
        sections={[
          { id: 'overview', label: 'Overview' },
          { id: 'outcomes', label: 'Outcomes' },
          { id: 'curriculum', label: 'Curriculum' },
          { id: 'faq', label: 'FAQ' },
        ]}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    expect(within(nav).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '#overview',
      '#outcomes',
      '#curriculum',
      '#faq',
    ]);
  });
});

describe('CourseSyllabus', () => {
  it('one EN row', () => {
    wrap(<CourseSyllabus courseId="c1" locales={['en']} />);
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/api/courses/c1/syllabus?locale=en']);
  });

  it('EN and JA rows', () => {
    wrap(<CourseSyllabus courseId="c1" locales={['en', 'ja']} />);
    expect(screen.getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual([
      '/api/courses/c1/syllabus?locale=en',
      '/api/courses/c1/syllabus?locale=ja',
    ]);
  });

  it('nothing without locales', () => {
    const { container } = wrap(<CourseSyllabus courseId="c1" locales={[]} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('CourseFaq', () => {
  const quotes = [{ text: 'Great', name: 'A', org: 'B' }];

  it('builds the data-driven items, first open', () => {
    const { view, cta } = setup(FUTURE);
    wrap(<CourseFaq view={view} cta={cta} quotes={quotes} />);
    const qs = screen.getAllByRole('button').filter((b) => b.hasAttribute('aria-controls'));
    expect(qs.map((q) => q.textContent?.replace('+', '').trim())).toEqual([
      'Is this course live?',
      'How long does it take?',
      'Is it available in Japanese?',
      'How do I get access?',
      'What’s the cancellation policy?',
    ]);
    expect(qs[0]).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Yes. It runs as a live cohort, starting Dec 1, 2026.')).toBeInTheDocument();
    expect(screen.getByText('Great')).toBeInTheDocument();
  });

  it('hides How long without totalWeeks and cancellation without a policy; no carousel without quotes', () => {
    const { view, cta } = setup(makeCourse({ total_weeks: null, cancellation_policy_en: null }));
    wrap(<CourseFaq view={view} cta={cta} quotes={[]} />);
    expect(screen.queryByText('How long does it take?')).toBeNull();
    expect(screen.queryByText('What’s the cancellation policy?')).toBeNull();
    expect(document.querySelector('blockquote')).toBeNull();
  });

  it('hides How do I get access when enrollment is closed or full', () => {
    const closed = setup(); // started cohort → R7
    expect(closed.cta.kind).toBe('closed');
    const { unmount } = wrap(<CourseFaq view={closed.view} cta={closed.cta} quotes={[]} />);
    expect(screen.queryByText('How do I get access?')).toBeNull();
    expect(document.body.textContent).not.toContain('Enroll once for');
    unmount();
    const full = setup(makeCourse({ start_date: null, max_enrollment: 2, current_enrollment: 2 }));
    expect(full.cta.kind).toBe('full');
    wrap(<CourseFaq view={full.view} cta={full.cta} quotes={[]} />);
    expect(screen.queryByText('How do I get access?')).toBeNull();
  });

  it('keeps How do I get access for an open paid course', () => {
    const open = setup(FUTURE);
    wrap(<CourseFaq view={open.view} cta={open.cta} quotes={[]} />);
    expect(screen.getByText('How do I get access?')).toBeInTheDocument();
  });

  it('hides How do I get access for enrolled viewers', () => {
    const { view, cta } = setup(makeCourse(), { signedIn: true, accessSource: 'enrollment' });
    wrap(<CourseFaq view={view} cta={cta} quotes={[]} />);
    expect(screen.queryByText('How do I get access?')).toBeNull();
  });
});

describe('CourseInstructors', () => {
  it('title_both for a bilingual course', () => {
    wrap(
      <CourseInstructors
        language="both"
        instructors={[{ name: 'Aki', role: 'lead', title: 'Founder', bio: 'Bio', photoUrl: null }]}
      />,
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Taught in English and 日本語');
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Aki');
    expect(screen.getByText('Lead instructor · Founder')).toBeInTheDocument();
  });

  it('title_one for one English instructor', () => {
    wrap(
      <CourseInstructors language="en" instructors={[{ name: 'Aki', role: null, title: null, bio: null, photoUrl: null }]} />,
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Your instructor');
  });

  it('absent with no instructors', () => {
    const { container } = wrap(<CourseInstructors language="both" instructors={[]} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('Overview, outcomes, closing', () => {
  it('overview renders audience, before and tools; absent when empty', () => {
    const { view } = setup();
    const { unmount } = wrap(<CourseOverview view={view} />);
    expect(screen.getByText('Beginners')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('ChatGPT')).toBeInTheDocument();
    unmount();
    const empty = setup(makeOneOnOne());
    const { container } = wrap(<CourseOverview view={empty.view} />);
    expect(container.innerHTML).toBe('');
  });

  it('outcomes are numbered; absent when empty', () => {
    const { unmount } = wrap(<CourseOutcomes outcomes={['One', 'Two']} />);
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
    unmount();
    const { container } = wrap(<CourseOutcomes outcomes={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('closing band uses the closed title for a closed cohort', () => {
    const { view, cta } = setup();
    wrap(<CourseClosing view={view} cta={cta} ctaLabel="Get notified about the next cohort" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Want the next cohort?');
    expect(screen.getByText('This cohort is under way. Enrollment is closed.')).toBeInTheDocument();
  });

  it('closing band for an included course', () => {
    const { view, cta } = setup(INCLUDED);
    wrap(<CourseClosing view={view} cta={cta} ctaLabel="Start learning in the Vault" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Start AI Essentials today.');
    expect(screen.getByRole('link', { name: /Start learning in the Vault/ })).toHaveAttribute(
      'href',
      '/api/stripe/subscribe?tier=vault',
    );
  });
});

describe('no console errors', () => {
  it.each([
    ['AI Essentials', makeCourse()],
    ['1v1 all-null', makeOneOnOne()],
  ])('renders every section for %s', (_name, course) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { view, cta } = setup(course);
    wrap(
      <>
        <CourseHero view={view} cta={cta} ctaLabel="x" />
        <CourseSubnav sections={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }]} />
        <CourseOverview view={view} />
        <CourseOutcomes outcomes={view.outcomes} />
        <CourseCurriculum modules={view.modules} curriculumOpen="first" heading="H" sub={null} showStage />
        <CourseInstructors language={view.language} instructors={view.instructors} />
        <CourseSyllabus courseId={view.id} locales={view.syllabusLocales} />
        <CourseFaq view={view} cta={cta} quotes={[]} />
        <CourseClosing view={view} cta={cta} ctaLabel="x" />
      </>,
    );
    expect(error).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toMatch(/\bnull\b|NaN|undefined/);
  });
});
