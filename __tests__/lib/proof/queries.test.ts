import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PublicProofArtifact } from '@/lib/proof/types';

const supa = vi.hoisted(() => {
  const state = { rows: [] as unknown[], error: null as unknown, calls: 0 };
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(async () => {
      state.calls += 1;
      return { data: state.rows, error: state.error };
    }),
  };
  const client = { from: vi.fn(() => query) };
  const createClient = vi.fn(() => client);
  return { state, query, client, createClient };
});

vi.mock('@supabase/supabase-js', () => ({ createClient: supa.createClient }));

// The public path must never touch the cookie-bound client (it would make
// every marketing page that shows proof dynamic).
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => {
    throw new Error('cookie-bound createClient must not be called on the public proof path');
  }),
  createAdminClient: vi.fn(() => {
    throw new Error('service-role client must not be called on the public proof path');
  }),
}));

// unstable_cache: records its arguments and wraps the fetcher so tests can
// count how many cached fetchers exist and how often each is hit.
const cache = vi.hoisted(() => ({ entries: [] as { keys: unknown; opts: unknown; hits: number }[] }));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => unknown, keys: unknown, opts: unknown) => {
    const entry = { keys, opts, hits: 0 };
    cache.entries.push(entry);
    return () => {
      entry.hits += 1;
      return fn();
    };
  },
}));

import { getPublishedLogos, getPublishedProof, getPublishedTestimonials, PROOF_TAG } from '@/lib/proof/queries';

function row(over: Partial<PublicProofArtifact>): PublicProofArtifact {
  return {
    id: 'x',
    artifact_type: 'testimonial',
    quote_en: null,
    quote_jp: null,
    title_en: null,
    title_jp: null,
    person_name: null,
    role_en: null,
    role_jp: null,
    org: null,
    person_image_url: null,
    logo_url: null,
    organization_url: null,
    rating: null,
    metrics_json: {},
    course_id: null,
    is_featured: false,
    display_order: 0,
    ...over,
  };
}

describe('public proof reads', () => {
  beforeEach(() => {
    supa.state.rows = [];
    supa.state.error = null;
    supa.state.calls = 0;
    supa.createClient.mockClear();
    supa.client.from.mockClear();
  });

  it('use a cookie-less anon client against the sanitized view', async () => {
    await getPublishedProof();
    expect(supa.createClient).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } },
    );
    expect(supa.client.from).toHaveBeenCalledWith('proof_artifacts_public');
  });

  it('testimonials keep only non-outcome rows with a real quote', async () => {
    supa.state.rows = [
      row({ id: 'a', quote_en: 'Great' }),
      row({ id: 'b', quote_en: '   ' }),
      row({ id: 'c', artifact_type: 'student_outcome', quote_en: 'Outcome' }),
      row({ id: 'd', artifact_type: 'case_study', quote_en: 'Case' }),
    ];
    expect((await getPublishedTestimonials(3)).map((r) => r.id)).toEqual(['a', 'd']);
    expect((await getPublishedTestimonials(1)).map((r) => r.id)).toEqual(['a']);
  });

  it('logos keep only rows with a logo_url', async () => {
    supa.state.rows = [row({ id: 'a', logo_url: 'https://x/a.png' }), row({ id: 'b', logo_url: ' ' }), row({ id: 'c' })];
    expect((await getPublishedLogos()).map((r) => r.id)).toEqual(['a']);
  });

  it('one cached fetch (proof-public, tagged proof) serves both helpers', async () => {
    expect(cache.entries).toHaveLength(1);
    expect(cache.entries[0].keys).toEqual(['proof-public']);
    expect(cache.entries[0].opts).toEqual({ revalidate: 300, tags: [PROOF_TAG] });
    const before = cache.entries[0].hits;
    await getPublishedTestimonials(1);
    await getPublishedLogos();
    expect(cache.entries[0].hits - before).toBe(2);
  });

  it('returns [] on a query error instead of throwing', async () => {
    supa.state.error = { message: 'boom' };
    await expect(getPublishedProof()).resolves.toEqual([]);
  });

  it('is cached under the proof tag the admin actions revalidate', () => {
    expect(PROOF_TAG).toBe('proof');
  });
});
