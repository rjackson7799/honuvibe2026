import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, createTranslator } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '@/messages/en.json';
import type { CourseWithCurriculum } from '@/lib/courses/types';
import { makeCourse } from '../../fixtures/course-detail';
import { stubMatchMedia } from '../hv/helpers';

const getCourseWithCurriculum = vi.fn();
const hasCourseAccess = vi.fn();
const getUser = vi.fn();

vi.mock('@/lib/courses/queries', () => ({
  getCourseWithCurriculum: (...args: unknown[]) => getCourseWithCurriculum(...args),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: () => getUser() } }),
}));
vi.mock('@/lib/enrollments/queries', () => ({
  hasCourseAccess: (...args: unknown[]) => hasCourseAccess(...args),
}));
vi.mock('@/lib/enrollments/actions', () => ({ simulatedEnroll: vi.fn() }));
vi.mock('@/lib/proof/page-quotes', () => ({ getPageQuotes: async () => [] }));
vi.mock('next-intl/server', () => ({
  setRequestLocale: () => {},
  getLocale: async () => 'en',
  getTranslations: async (arg: string | { locale?: string; namespace?: string }) => {
    const namespace = typeof arg === 'string' ? arg : arg.namespace;
    return createTranslator({ locale: 'en', messages: en, namespace: namespace as never });
  },
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/learn/s1',
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} data-intl-link="true" {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock('@/components/marketing/nav/marketing-nav', () => ({
  MarketingNav: ({ cta }: { cta?: string | null }) => <div data-testid="nav" data-cta={String(cta)} />,
}));
vi.mock('@/components/marketing/footer/marketing-footer', () => ({
  MarketingFooter: () => <div data-testid="footer" />,
}));
vi.mock('@/components/marketing/newsletter/marketing-newsletter', () => ({
  MarketingNewsletter: ({ source }: { source: string }) => (
    <div id="newsletter" data-testid="newsletter" data-source={source} />
  ),
}));
vi.mock('@/components/marketing/hv', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  HvReveal: () => null,
}));

import CourseDetailPage, { generateMetadata } from '@/app/[locale]/learn/[slug]/page';
import CourseNotFound from '@/app/[locale]/learn/[slug]/not-found';

const params = (locale = 'en', slug = 's1') => ({ params: Promise.resolve({ locale, slug }) });

async function renderPage(locale = 'en') {
  const tree = await CourseDetailPage(params(locale));
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {tree}
    </NextIntlClientProvider>,
  );
}

const INCLUDED: CourseWithCurriculum = makeCourse({
  course_type: 'self-study',
  vault_included: true,
  start_date: null,
  live_sessions_count: 0,
});

const hrefs = () => [...document.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '');

beforeEach(() => {
  stubMatchMedia(false);
  getCourseWithCurriculum.mockReset();
  hasCourseAccess.mockReset();
  getUser.mockReset();
  getUser.mockResolvedValue({ data: { user: null } });
});

describe('/learn/[slug] page', () => {
  it('unknown slug calls notFound', async () => {
    getCourseWithCurriculum.mockResolvedValue(null);
    await expect(CourseDetailPage(params())).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('signed-out on the in-progress cohort shows the closed state', async () => {
    getCourseWithCurriculum.mockResolvedValue(makeCourse());
    await renderPage();
    const notify = screen.getAllByRole('link', { name: 'Get notified about the next cohort' });
    expect(notify.length).toBeGreaterThanOrEqual(2);
    for (const a of notify) expect(a).toHaveAttribute('href', '#newsletter');
    expect(document.body.textContent).not.toContain('Join the Vault');
    expect(hrefs().some((h) => h.includes('/api/stripe/subscribe'))).toBe(false);
    expect(screen.getByTestId('nav')).toHaveAttribute('data-cta', 'undefined');
    expect(screen.getByTestId('newsletter')).toHaveAttribute('data-source', 'course');
    expect(document.getElementById('curriculum')).not.toBeNull();
  });

  it('vault reader sees Open in your Vault and no price', async () => {
    getCourseWithCurriculum.mockResolvedValue(INCLUDED);
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    hasCourseAccess.mockResolvedValue({ hasAccess: true, source: 'vault', enrollment: null });
    await renderPage();
    const open = screen.getAllByRole('link', { name: 'Open in your Vault' });
    expect(open.length).toBeGreaterThanOrEqual(2);
    for (const a of open) expect(a).toHaveAttribute('href', '/learn/dashboard/s1');
    expect(document.body.textContent).not.toContain('$1,250');
    expect(hrefs().some((h) => h.includes('/api/stripe/subscribe'))).toBe(false);
    expect(screen.getByTestId('nav')).toHaveAttribute('data-cta', 'undefined');
    expect(hasCourseAccess).toHaveBeenCalledWith('u1', INCLUDED);
  });

  it('signed-out on an included course gets Join the Vault in hero, price card, closing band and nav', async () => {
    getCourseWithCurriculum.mockResolvedValue(INCLUDED);
    await renderPage();
    const subscribe = hrefs().filter((h) => h === '/api/stripe/subscribe?tier=vault');
    expect(subscribe).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Join the Vault' })).toBeInTheDocument();
    expect(screen.getByTestId('nav')).toHaveAttribute('data-cta', 'join_vault');
    expect(document.body.textContent).not.toContain('$1,250');
  });

  it('enrolled user sees Go to your course', async () => {
    getCourseWithCurriculum.mockResolvedValue(makeCourse());
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    hasCourseAccess.mockResolvedValue({ hasAccess: true, source: 'enrollment', enrollment: {} });
    await renderPage();
    const go = screen.getAllByRole('link', { name: 'Go to your course' });
    expect(go.length).toBeGreaterThanOrEqual(2);
    for (const a of go) expect(a).toHaveAttribute('href', '/learn/dashboard/s1');
  });

  it('hasCourseAccess is not called when signed out', async () => {
    getCourseWithCurriculum.mockResolvedValue(makeCourse());
    await renderPage();
    expect(hasCourseAccess).not.toHaveBeenCalled();
  });

  it('lists only rendered sections in the sub-nav', async () => {
    getCourseWithCurriculum.mockResolvedValue(makeCourse());
    await renderPage();
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    const targets = [...nav.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(targets).toEqual(['#overview', '#outcomes', '#curriculum', '#syllabus', '#faq']);
    for (const id of targets) expect(document.getElementById(id!.slice(1))).not.toBeNull();
  });
});

describe('generateMetadata', () => {
  it('private course metadata is noindex', async () => {
    getCourseWithCurriculum.mockResolvedValue(makeCourse({ is_private: true }));
    const meta = await generateMetadata(params());
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it('public course metadata has canonical + languages', async () => {
    getCourseWithCurriculum.mockResolvedValue(makeCourse());
    const meta = await generateMetadata(params('ja'));
    expect(meta.title).toBe('AIエッセンシャルズ');
    expect(meta.description).toBe('AIを始めよう。');
    expect(meta.alternates).toEqual({
      canonical: '/ja/learn/s1',
      languages: { en: '/learn/s1', ja: '/ja/learn/s1' },
    });
    expect(meta.robots).toBeUndefined();
  });

  it('unknown course has a plain title', async () => {
    getCourseWithCurriculum.mockResolvedValue(null);
    const meta = await generateMetadata(params());
    expect(meta.title).toBe('Course Not Found');
  });
});

describe('not-found', () => {
  it('renders the hv nav and footer', async () => {
    const tree = await CourseNotFound();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        {tree}
      </NextIntlClientProvider>,
    );
    expect(screen.getByTestId('nav')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('We couldn’t find that course');
    expect(screen.getByRole('link', { name: 'Browse courses' })).toHaveAttribute('href', '/learn');
    expect(document.querySelector('[data-shell="hv"]')).not.toBeNull();
  });
});
