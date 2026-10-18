import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '@/messages/en.json';
import {
  LearnCatalog,
  LearnFaq,
  LearnHero,
  LearnHotTopics,
  LearnPricingStrip,
  LearnSidebar,
} from '@/components/marketing/learn';
import { __resetCatalogStoreForTests } from '@/components/marketing/learn/catalog-state';
import type { LearnCatalogEntry } from '@/lib/learn/catalog';
import { stubMatchMedia } from '../hv/helpers';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} data-intl-link="true" {...rest}>
      {children}
    </a>
  ),
}));

function entry(over: Partial<LearnCatalogEntry>): LearnCatalogEntry {
  return {
    kind: 'lesson',
    id: 'x',
    href: '/learn/vault/x',
    title: 'X',
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

const ENTRIES: LearnCatalogEntry[] = [
  entry({
    id: 'p1', href: '/learn/vault/p1', title: 'Prompt basics', blurb: 'Ten prompts to reuse',
    free: true, meta: { kind: 'minutes', value: 12 }, level: 'beginner',
  }),
  entry({ id: 'p2', href: '/learn/vault/p2', title: 'Write faster', blurb: 'Draft in your voice' }),
  entry({
    id: 'm1', href: '/learn/vault/m1', title: 'SEO with AI', blurb: 'Rank higher in search',
    track: 'marketing_growth', free: true, meta: { kind: 'type', value: 'video' },
  }),
  entry({ id: 'm2', href: '/learn/vault/m2', title: 'Email campaigns', blurb: 'Run a campaign', track: 'marketing_growth' }),
  entry({ id: 'w1', href: '/learn/vault/w1', title: 'Monday report', blurb: 'Reporting on autopilot', track: 'workflow_automation' }),
  entry({
    kind: 'course', id: 'c1', href: '/learn/c1', title: 'Hands-off operations', blurb: 'A four week course',
    track: 'workflow_automation', meta: { kind: 'weeks', value: 4 },
  }),
];

const QUOTES = [
  { text: 'It worked.', name: 'A. Person', org: 'Owner' },
  { text: 'It still works.', name: 'B. Person', org: 'Manager' },
];

function wrap(ui: ReactNode, onError = vi.fn()) {
  return render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Pacific/Honolulu" onError={onError}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function renderCatalogPage() {
  return wrap(
    <>
      <LearnHero freeFeature={ENTRIES[0]} />
      <LearnCatalog entries={ENTRIES} />
      <LearnSidebar />
    </>,
  );
}

const grid = () => screen.getByTestId('learn-grid');
const cardTitles = () => {
  const list = screen.queryByTestId('learn-grid');
  if (!list) return [];
  return within(list)
    .queryAllByRole('heading', { level: 3 })
    .map((h) => h.textContent);
};

beforeEach(() => {
  __resetCatalogStoreForTests();
  window.history.replaceState({}, '', '/learn');
  stubMatchMedia(true);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LearnHero', () => {
  it('renders the h1, the search box and the free card', () => {
    wrap(<LearnHero freeFeature={ENTRIES[0]} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Learn in the Vault' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search lessons' })).toBeInTheDocument();
    const card = screen.getByRole('link', { name: /Prompt basics/ });
    expect(card).toHaveAttribute('href', '/learn/vault/p1');
    expect(within(card).getByText('Free lesson')).toBeInTheDocument();
  });

  it('omits the free card when there is no free lesson', () => {
    wrap(<LearnHero freeFeature={null} />);
    expect(screen.queryByText('Free lesson')).not.toBeInTheDocument();
  });
});

describe('Learn catalog filtering', () => {
  it('shows every entry by default with the all-tracks headline', () => {
    renderCatalogPage();
    expect(cardTitles()).toHaveLength(6);
    expect(screen.getByText('Every lesson and course, in one place')).toBeInTheDocument();
    expect(screen.getByText('6 lessons')).toBeInTheDocument();
  });

  it('submitting a search filters the grid and writes ?q=', () => {
    renderCatalogPage();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search lessons' }), { target: { value: 'SEO' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(cardTitles()).toEqual(['SEO with AI']);
    expect(window.location.search).toBe('?q=seo');
    expect(screen.getByText('Results for “seo”')).toBeInTheDocument();
  });

  it('a track chip presses, filters and sets the track headline', () => {
    renderCatalogPage();
    const chip = screen.getByRole('button', { name: 'Marketing & Growth' });
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(cardTitles()).toEqual(['SEO with AI', 'Email campaigns']);
    expect(screen.getByText('Marketing & Growth: Reach customers and grow sales')).toBeInTheDocument();
    expect(window.location.search).toBe('?track=marketing_growth');
  });

  it('the free switch keeps only free entries', () => {
    renderCatalogPage();
    const sw = screen.getByRole('switch', { name: 'Free lessons only' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(cardTitles()).toEqual(['Prompt basics', 'SEO with AI']);
    expect(screen.getByText('2 lessons')).toBeInTheDocument();
  });

  it('no match shows the empty state; Clear filters restores everything', () => {
    renderCatalogPage();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search lessons' }), { target: { value: 'zzz' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(screen.getByText('Nothing matches yet. Try another track or clear the filters.')).toBeInTheDocument();
    expect(cardTitles()).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(cardTitles()).toHaveLength(6);
    expect(window.location.pathname + window.location.search).toBe('/learn');
  });

  it('a hot chip searches across all tracks', () => {
    renderCatalogPage();
    fireEvent.click(screen.getByRole('button', { name: 'Marketing & Growth' }));
    fireEvent.click(screen.getByRole('button', { name: 'Prompts' }));
    expect(cardTitles()).toEqual(['Prompt basics']);
    expect(window.location.search).toBe('?q=prompt');
  });

  it('a sidebar goal sets its mapped track', () => {
    renderCatalogPage();
    fireEvent.click(screen.getByRole('button', { name: /I want to stop retyping the same email/ }));
    expect(screen.getByRole('button', { name: 'Workflow & Automation' })).toHaveAttribute('aria-pressed', 'true');
    expect(cardTitles()).toEqual(['Monday report', 'Hands-off operations']);
  });

  it('honours a ?track= deep link after mount', () => {
    window.history.replaceState({}, '', '/learn?track=marketing_growth');
    renderCatalogPage();
    expect(cardTitles()).toEqual(['SEO with AI', 'Email campaigns']);
  });
});

describe('LearnCatalogCard', () => {
  it('a course card is tagged and links to /learn/<slug>; a lesson links to the Vault', () => {
    renderCatalogPage();
    const course = within(grid()).getByRole('link', { name: /Hands-off operations/ });
    expect(course).toHaveAttribute('href', '/learn/c1');
    expect(within(course).getByText('Course')).toBeInTheDocument();
    expect(within(course).getByText('4 weeks')).toBeInTheDocument();
    const lesson = within(grid()).getByRole('link', { name: /Prompt basics/ });
    expect(lesson).toHaveAttribute('href', '/learn/vault/p1');
    expect(within(lesson).getByText('12 min · Beginner')).toBeInTheDocument();
    expect(within(lesson).getByText('Free')).toBeInTheDocument();
    const video = within(grid()).getByRole('link', { name: /SEO with AI/ });
    expect(within(video).getByText('Video')).toBeInTheDocument();
  });
});

describe('LearnHotTopics', () => {
  it('renders nothing with fewer than two topics', () => {
    const { container } = wrap(<LearnHotTopics topics={[ENTRIES[0]]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('numbers the topics and links each one', () => {
    wrap(<LearnHotTopics topics={ENTRIES.slice(0, 2)} />);
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Write faster/ })).toHaveAttribute('href', '/learn/vault/p2');
  });
});

describe('LearnFaq', () => {
  it('lists six questions with the first open', () => {
    wrap(<LearnFaq quotes={QUOTES} />);
    const open = screen.getAllByRole('button', { expanded: true });
    const closed = screen.getAllByRole('button', { expanded: false });
    expect(open.length + closed.length).toBe(6);
    expect(screen.getByRole('button', { name: 'Do I need a technical background?' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('It worked.')).toBeInTheDocument();
  });

  it('hides the carousel without quotes', () => {
    wrap(<LearnFaq quotes={[]} />);
    expect(screen.queryByText('It worked.')).not.toBeInTheDocument();
    expect(document.querySelector('blockquote')).toBeNull();
  });
});

describe('LearnPricingStrip', () => {
  it('Join the Vault is a plain anchor to the subscribe API', () => {
    wrap(<LearnPricingStrip freeHref="/learn/vault/p1" hasFreeLesson />);
    const vault = screen.getByRole('link', { name: 'Join the Vault' });
    expect(vault).toHaveAttribute('href', '/api/stripe/subscribe?tier=vault');
    expect(vault).not.toHaveAttribute('data-intl-link');
    expect(screen.getByRole('link', { name: /Try a free lesson/ })).toHaveAttribute('href', '/learn/vault/p1');
  });

  it('without a free lesson the amber CTA is Get started free → /signup', () => {
    wrap(<LearnPricingStrip freeHref="/signup" hasFreeLesson={false} />);
    expect(screen.getByRole('link', { name: /Get started free/ })).toHaveAttribute('href', '/signup');
  });
});

describe('full page tree', () => {
  it('renders without console errors or missing messages', () => {
    const errors = vi.spyOn(console, 'error');
    const onError = vi.fn();
    wrap(
      <>
        <LearnHero freeFeature={ENTRIES[0]} />
        <LearnHotTopics topics={ENTRIES.slice(0, 4)} />
        <LearnCatalog entries={ENTRIES} />
        <LearnSidebar />
        <LearnFaq quotes={QUOTES} />
        <LearnPricingStrip freeHref="/signup" hasFreeLesson={false} />
      </>,
      onError,
    );
    expect(errors).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
