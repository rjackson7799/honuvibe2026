/**
 * B2 / migration 079 — tracks + vault_included, and what the public catalog
 * can see as anon. Plan: docs/plans/2026-10-10-b2-tracks-vault-inclusion.md.
 */
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { anonClient, serviceClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';
import { PUBLIC_CATALOG_COLUMNS } from '../../lib/vault/catalog';

const admin = serviceClient();
const SLUG = {
  premium: 'b2-fixture-premium-published',
  draft: 'b2-fixture-unpublished',
  partner: 'b2-fixture-partner-published',
};
const COURSE_SLUG = 'b2-fixture-course';
const ids: Record<string, string> = {};

async function cleanup() {
  await admin.from('content_items').delete().in('slug', Object.values(SLUG));
  await admin.from('courses').delete().eq('slug', COURSE_SLUG);
}

beforeAll(async () => {
  await seedFixtures();
  await cleanup();
  const rows = [
    { slug: SLUG.premium, is_published: true, access_tier: 'premium', track: 'research_insights', partner_id: null },
    { slug: SLUG.draft, is_published: false, access_tier: 'free', track: 'ai_essentials', partner_id: null },
    { slug: SLUG.partner, is_published: true, access_tier: 'free', track: 'ai_essentials', partner_id: FIXTURES.partners.vertice },
  ].map((r) => ({
    ...r,
    title_en: r.slug,
    content_type: 'article',
    url: `https://example.com/${r.slug}`,
  }));
  const { data, error } = await admin.from('content_items').insert(rows).select('id, slug');
  if (error) throw error;
  for (const r of data ?? []) ids[r.slug as string] = r.id as string;

  const { error: bodyErr } = await admin.from('vault_article_bodies').insert({
    content_item_id: ids[SLUG.premium],
    body_en: 'premium body',
  });
  if (bodyErr) throw bodyErr;
});

afterAll(cleanup);

describe('vault catalog as anon (079)', () => {
  test('anon reads track on a published premium item', async () => {
    const { data, error } = await anonClient()
      .from('content_items')
      .select('slug, track, access_tier')
      .eq('slug', SLUG.premium);
    expect(error).toBeNull();
    expect(data).toEqual([{ slug: SLUG.premium, track: 'research_insights', access_tier: 'premium' }]);
  });

  test('anon reads no unpublished item', async () => {
    const { data, error } = await anonClient().from('content_items').select('id').eq('slug', SLUG.draft);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test("the catalog query's filters return published HonuVibe items and skip partner-owned ones", async () => {
    const { data, error } = await anonClient()
      .from('content_items')
      .select(PUBLIC_CATALOG_COLUMNS)
      .eq('is_published', true)
      .is('partner_id', null)
      .in('slug', Object.values(SLUG));
    expect(error).toBeNull();
    expect((data ?? []).map((r) => (r as unknown as { slug: string }).slug)).toEqual([SLUG.premium]);
  });

  test('anon cannot read the premium article body', async () => {
    const { data, error } = await anonClient()
      .from('vault_article_bodies')
      .select('content_item_id')
      .eq('content_item_id', ids[SLUG.premium]);
    // Either RLS filters the row out or the role has no grant at all; both
    // mean anon gets no body. A different failure must not pass silently.
    if (error) expect(error.code).toBe('42501');
    else expect(data).toEqual([]);
  });
});

describe('079 constraints and defaults', () => {
  test('content_items rejects an unknown track', async () => {
    const { error } = await admin
      .from('content_items')
      .update({ track: 'bogus' })
      .eq('id', ids[SLUG.premium]);
    expect(error?.code).toBe('23514');
  });

  test('courses: vault_included defaults false, track CHECK holds, NULL track allowed', async () => {
    const { data, error } = await admin
      .from('courses')
      // self-study: since 087 only self-study courses may set vault_included.
      .insert({ slug: COURSE_SLUG, title_en: 'B2 fixture course', course_type: 'self-study' })
      .select('vault_included, track')
      .single();
    expect(error).toBeNull();
    expect(data).toEqual({ vault_included: false, track: null });

    const bad = await admin.from('courses').update({ track: 'bogus' }).eq('slug', COURSE_SLUG);
    expect(bad.error?.code).toBe('23514');

    const good = await admin
      .from('courses')
      .update({ track: 'workflow_automation', vault_included: true })
      .eq('slug', COURSE_SLUG);
    expect(good.error).toBeNull();
  });
});
