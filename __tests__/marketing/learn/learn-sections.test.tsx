import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import en from '@/messages/en.json';
import {
  LearnHero,
  LearnThreePaths,
  LearnVaultMoment,
  LearnCoursesCatalog,
  LearnPrivateCohorts,
  LearnComparisonTable,
} from '@/components/marketing/learn';
import type { Course, CourseLevel } from '@/lib/courses/types';

vi.mock('next-intl', () => {
  function getNs(ns: string): Record<string, unknown> {
    return ns.split('.').reduce<unknown>((o, k) => {
      if (o && typeof o === 'object' && k in (o as Record<string, unknown>)) {
        return (o as Record<string, unknown>)[k];
      }
      return undefined;
    }, en) as Record<string, unknown>;
  }

  function tFor(ns: string) {
    const base = getNs(ns) ?? {};
    function t(key: string, vars?: Record<string, unknown>): string {
      const raw = (base as Record<string, unknown>)[key];
      if (typeof raw !== 'string') return key;
      const flattened = raw.replace(/<\/?[^>]+>/g, '');
      if (!vars) return flattened;
      return Object.entries(vars).reduce<string>(
        (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
        flattened,
      );
    }
    return t;
  }

  return {
    useTranslations: (namespace: string) => tFor(namespace),
  };
});

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: 'c-1',
    slug: 'sample',
    course_id_code: null,
    course_type: 'cohort',
    title_en: 'Sample',
    title_jp: null,
    description_en: 'A sample course description.',
    description_jp: null,
    instructor_name: null,
    instructor_id: null,
    price_usd: 1250,
    price_jpy: null,
    instructor_revenue_share_pct: null,
    language: 'en',
    subtitle_language: null,
    level: null,
    format: null,
    start_date: null,
    end_date: null,
    total_weeks: null,
    live_sessions_count: null,
    recorded_lessons_count: null,
    max_enrollment: null,
    current_enrollment: 0,
    learning_outcomes_en: null,
    learning_outcomes_jp: null,
    prerequisites_en: null,
    prerequisites_jp: null,
    who_is_for_en: null,
    who_is_for_jp: null,
    tools_covered: null,
    community_platform: null,
    community_duration_months: null,
    community_link: null,
    zoom_link: null,
    schedule_notes_en: null,
    schedule_notes_jp: null,
    cancellation_policy_en: null,
    cancellation_policy_jp: null,
    completion_requirements_en: null,
    completion_requirements_jp: null,
    materials_summary_en: null,
    materials_summary_jp: null,
    thumbnail_url: null,
    hero_image_url: null,
    tags: null,
    is_featured: false,
    is_published: true,
    is_private: false,
    status: 'published',
    esl_enabled: false,
    esl_included: false,
    esl_price_usd: null,
    esl_price_jpy: null,
    esl_settings_json: null,
    free_preview_count: 0,
    syllabus_url_en: null,
    syllabus_url_jp: null,
    proposed_by_instructor_id: null,
    proposal_submitted_at: null,
    proposal_review_notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const fixtureCourses: Course[] = [
  makeCourse({
    id: 'c-essentials',
    slug: 'ai-essentials',
    title_en: 'AI Essentials',
    level: 'beginner' as CourseLevel,
    total_weeks: 5,
    language: 'both',
  }),
  makeCourse({
    id: 'c-mastery',
    slug: 'ai-mastery',
    title_en: 'AI Mastery',
    level: 'intermediate' as CourseLevel,
    total_weeks: 5,
    language: 'both',
    price_usd: 1750,
  }),
  makeCourse({
    id: 'c-claude-code',
    slug: 'claude-code',
    title_en: 'Claude Code',
    level: 'advanced' as CourseLevel,
    total_weeks: 6,
    language: 'en',
    tags: ['builder-track'],
  }),
  makeCourse({
    id: 'c-saas',
    slug: 'micro-saas',
    title_en: 'Micro-SaaS',
    level: 'advanced' as CourseLevel,
    total_weeks: 8,
    language: 'en',
    tags: ['builder-track'],
  }),
];

describe('Learn page sections', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('Hero renders the two-line headline + caption overline', () => {
    render(<LearnHero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain('Three paths.');
    expect(h1.textContent).toContain('One destination.');
    expect(screen.getByText(/Ways to Learn/i)).toBeInTheDocument();
  });

  it('ThreePaths shows three card titles, the Most Popular ribbon, and routes Private CTA to /partnerships', () => {
    render(<LearnThreePaths />);
    expect(screen.getByRole('heading', { name: 'The Vault' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Public Courses' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Private Cohorts' })).toBeInTheDocument();
    expect(screen.getByText('MOST POPULAR')).toBeInTheDocument();
    expect(screen.getByText('MEMBERSHIP')).toBeInTheDocument();
    expect(screen.getByText('COHORT-BASED')).toBeInTheDocument();
    expect(screen.getByText('BY APPLICATION')).toBeInTheDocument();
    const privateCta = screen.getByRole('link', { name: /Apply for Partnership/i });
    expect(privateCta).toHaveAttribute('href', '/partnerships');
  });

  it('VaultMoment shows the heading and Start Your Membership CTA', () => {
    render(<LearnVaultMoment />);
    expect(screen.getByRole('heading', { name: 'Inside The Vault.' })).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /Start Your Membership/i });
    expect(cta).toHaveAttribute('href', '/learn#vault');
  });

  it('CoursesCatalog (server wrapper) renders heading and subhead', () => {
    render(<LearnCoursesCatalog courses={fixtureCourses} locale="en" />);
    expect(screen.getByRole('heading', { name: 'Browse the catalog.' })).toBeInTheDocument();
    expect(screen.getByText(/Per-course enrollment/)).toBeInTheDocument();
  });

  it('CoursesCatalog default filter shows all fixture courses with /learn/{slug} hrefs', () => {
    render(<LearnCoursesCatalog courses={fixtureCourses} locale="en" />);
    expect(screen.getByRole('heading', { name: 'AI Essentials' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI Mastery' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Claude Code' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Micro-SaaS' })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /AI Essentials/ })).toHaveAttribute(
      'href',
      '/learn/ai-essentials',
    );
    expect(screen.getByRole('link', { name: /Claude Code/ })).toHaveAttribute(
      'href',
      '/learn/claude-code',
    );
  });

  it('CoursesCatalog Beginner filter narrows to beginner courses', () => {
    render(<LearnCoursesCatalog courses={fixtureCourses} locale="en" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Beginner' }));
    expect(screen.getByRole('heading', { name: 'AI Essentials' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'AI Mastery' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Claude Code' })).not.toBeInTheDocument();
  });

  it('CoursesCatalog Builder Track filter narrows to tagged courses', () => {
    render(<LearnCoursesCatalog courses={fixtureCourses} locale="en" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Builder Track' }));
    expect(screen.queryByRole('heading', { name: 'AI Essentials' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'AI Mastery' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Claude Code' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Micro-SaaS' })).toBeInTheDocument();
    expect(screen.getAllByText('TRACK')).toHaveLength(2);
  });

  it('CoursesCatalog shows the empty state when no courses match', () => {
    render(<LearnCoursesCatalog courses={[]} locale="en" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Builder Track' }));
    expect(
      screen.getByText(/No courses match this filter yet/),
    ).toBeInTheDocument();
  });

  it('PrivateCohorts shows both partners, status pills, and an Apply CTA to /partnerships', () => {
    render(<LearnPrivateCohorts />);
    expect(screen.getByText('Vertice Society')).toBeInTheDocument();
    expect(screen.getByText('SmashHaus')).toBeInTheDocument();
    expect(screen.getByText('IN SESSION')).toBeInTheDocument();
    expect(screen.getByText('COMING SOON')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /Apply for Partnership/i });
    expect(cta).toHaveAttribute('href', '/partnerships');
  });

  it('ComparisonTable shows heading, three column subtitles, and five row labels', () => {
    render(<LearnComparisonTable />);
    expect(
      screen.getByRole('heading', { name: 'Which path is right for me?' }),
    ).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('The Vault')).toBeInTheDocument();
    expect(within(table).getByText('Public Courses')).toBeInTheDocument();
    expect(within(table).getByText('Private Cohorts')).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'Best for' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'Format' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'Time commitment' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'Investment' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'Start' })).toBeInTheDocument();
  });

  it('renders every Learn section without console.error', () => {
    render(
      <>
        <LearnHero />
        <LearnThreePaths />
        <LearnVaultMoment />
        <LearnCoursesCatalog courses={fixtureCourses} locale="en" />
        <LearnPrivateCohorts />
        <LearnComparisonTable />
      </>,
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
