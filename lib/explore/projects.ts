/**
 * Source of truth for projects shown on /explore ("The Wayfinding Chart").
 * Consumed by WayfindingRoute: projects present in REEL_PROJECTS render as
 * expanded waypoints (screenshot + quote + stats), the rest as compact ones.
 *
 * Copy lives in messages/{en,ja}.json under explore.reel_hero.projects.<key>
 * (rich) and explore.index.projects.<key> (compact). This file owns structure,
 * not text.
 */

export type ProjectStatus = 'live' | 'in_progress' | 'confidential';

export type ReelProject = {
  key: string;
  /** Browser-frame URL chip text. */
  url: string;
  /** External href for the "visit" affordance. Omit for unreleased. */
  liveUrl?: string;
  /** /public path to the project screenshot. */
  image: string;
  imageAlt: string;
  status: ProjectStatus;
  industry: string;
  stack: readonly string[];
};

export type IndexProject = {
  key: string;
  /** Display number, zero-padded ('01', '02', ...). */
  number: string;
  year: string;
  industry: string;
  industryFilter: IndustryFilter;
  stack: readonly string[];
  status: ProjectStatus;
  /** Optional internal link to a project detail page. Omit for confidential rows. */
  href?: string;
};

export type IndustryFilter =
  | 'cultural'
  | 'healthcare'
  | 'community'
  | 'commerce'
  | 'enterprise';

export const REEL_PROJECTS: readonly ReelProject[] = [
  {
    key: 'kwame',
    url: 'kwamebrathwaite.com',
    liveUrl: 'https://kwamebrathwaite.com',
    image: '/projects/kwame-brathwaite/KB_1.jpg',
    imageAlt: 'KwameBrathwaite.com homepage',
    status: 'live',
    industry: 'Cultural · Portfolio',
    stack: ['Next.js', 'Tailwind CSS', 'Claude', 'Cursor', 'Vercel'],
  },
  {
    key: 'hci',
    url: 'hcimed.com',
    liveUrl: 'https://hcimed.com',
    image: '/projects/hci-medical/HCI_1.jpg',
    imageAlt: 'HCI Medical Group homepage',
    status: 'live',
    industry: 'Healthcare · Internal tools',
    stack: ['Next.js', 'Tailwind CSS', 'Supabase', 'Custom PM', 'Vercel'],
  },
] as const;

export const INDEX_PROJECTS: readonly IndexProject[] = [
  {
    key: 'kwame',
    number: '01',
    year: '2026',
    industry: 'Cultural · Portfolio',
    industryFilter: 'cultural',
    stack: ['Next.js', 'Tailwind CSS', 'Claude', '+2'],
    status: 'live',
    href: 'https://kwamebrathwaite.com',
  },
  {
    key: 'hci',
    number: '02',
    year: '2026',
    industry: 'Healthcare · Internal tools',
    industryFilter: 'healthcare',
    stack: ['Next.js', 'Tailwind CSS', 'Supabase', '+1'],
    status: 'live',
    href: 'https://hcimed.com',
  },
  {
    key: 'vertice',
    number: '03',
    year: '2026',
    industry: 'Community · Membership',
    industryFilter: 'community',
    stack: ['Next.js', 'Supabase', 'Claude', '+1'],
    status: 'in_progress',
  },
  {
    key: 'confidential_commerce',
    number: '04',
    year: '2026',
    industry: 'Commerce · Brand',
    industryFilter: 'commerce',
    stack: ['Astro', 'Shopify Storefront', 'Claude'],
    status: 'confidential',
  },
  {
    key: 'confidential_enterprise',
    number: '05',
    year: '2026',
    industry: 'Enterprise · Internal tool',
    industryFilter: 'enterprise',
    stack: ['Next.js', 'Postgres', 'Claude API'],
    status: 'confidential',
  },
] as const;

export const INDUSTRY_FILTERS: readonly IndustryFilter[] = [
  'cultural',
  'healthcare',
  'community',
  'commerce',
  'enterprise',
] as const;
