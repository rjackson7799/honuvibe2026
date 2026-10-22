import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.TEST_SUPABASE_URL;
const ANON = process.env.TEST_SUPABASE_ANON_KEY;
const SERVICE = process.env.TEST_SUPABASE_SERVICE_KEY;

if (!URL || !ANON || !SERVICE) {
  throw new Error(
    'Missing TEST_SUPABASE_URL / TEST_SUPABASE_ANON_KEY / TEST_SUPABASE_SERVICE_KEY. ' +
      'Run `supabase status` and populate .env.test.local.',
  );
}

// Prod guard: suites like client_previews_rls delete EVERY row of a table in
// beforeEach, so a mis-set TEST_SUPABASE_URL must never reach production.
if (URL.includes('zvfwtndbxshrtpwcwynw')) {
  throw new Error('Refusing to run RLS tests against production');
}

/** Service-role client — bypasses RLS. Use only for seed/teardown. */
export function serviceClient(): SupabaseClient {
  return createClient(URL!, SERVICE!, { auth: { persistSession: false } });
}

/** Anonymous client — no JWT. RLS treats auth.uid() as null. */
export function anonClient(): SupabaseClient {
  return createClient(URL!, ANON!, { auth: { persistSession: false } });
}

/**
 * Authenticated client for a known fixture user. Signs in with the
 * password seeded by fixtures.seedFixtures().
 */
export async function userClient(userId: string): Promise<SupabaseClient> {
  const client = createClient(URL!, ANON!, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({
    email: `${userId}@fixture.local`,
    password: `fixture-pass-${userId}`,
  });
  if (error) throw error;
  return client;
}
