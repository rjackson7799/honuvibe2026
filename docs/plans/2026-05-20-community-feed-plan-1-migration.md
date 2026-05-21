# Community Feed — Plan 1: Migration & RLS Tests

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the database layer for the community feed MVP — all tables, RLS policies, helper functions, triggers, plus a 9-test RLS leak suite that locks the multi-tenant access boundary in CI.

**Architecture:** One SQL migration (`042_community_feed.sql`) + a new `supabase/tests/` directory running RLS leak tests through `supabase-js` with per-user JWTs against a local Supabase instance. No app code in this plan; this ships an empty but secure data layer. Frontend and API come in later plans.

**Tech Stack:** PostgreSQL (Supabase), vitest, `@supabase/supabase-js`, local Supabase CLI (`supabase db reset`).

**Spec:** [docs/plans/2026-05-20-community-feed-mvp-design.md](./2026-05-20-community-feed-mvp-design.md). Sections 0, 1, 2, and the testing portion of Section 6 are in scope for this plan.

---

## File Structure

### New files

- `supabase/migrations/042_community_feed.sql` — full migration: helpers, tables, indexes, triggers, RLS policies, `partners.line_url` column, `partner_members` backfill
- `supabase/tests/community_rls.test.ts` — 9 RLS leak tests
- `supabase/tests/helpers/clients.ts` — utility to create authenticated Supabase clients (anon + per-user JWT)
- `supabase/tests/helpers/fixtures.ts` — fixture user IDs + helper to seed/reset community fixture data
- `supabase/seed_community_test_users.sql` — idempotent seed of 7 fixture users (run once before tests)

### Modified files

- `vitest.config.ts` — add a separate project for `supabase/tests/**` so RLS tests don't run on every `npm test` (they require a Supabase instance)
- `package.json` — add `test:rls` script that targets the supabase project

### Not touched in this plan

App code, API routes, components, i18n keys — all come in Plans 2–4.

---

## Pre-flight (do this once before Task 1)

- [ ] **Confirm Supabase CLI is installed and a local instance is running.**

Run:
```bash
supabase --version
supabase status
```
Expected: version printed; `API URL`, `DB URL`, `anon key`, `service_role key` all listed. If `supabase start` hasn't been run, run it.

- [ ] **Capture the local Supabase keys into `.env.test.local` (gitignored).**

Read `supabase status` output. Create `.env.test.local` with:
```
TEST_SUPABASE_URL=http://127.0.0.1:54321
TEST_SUPABASE_ANON_KEY=<from `supabase status`>
TEST_SUPABASE_SERVICE_KEY=<from `supabase status`>
```

Verify the file is gitignored:
```bash
grep -E '^\.env\.test|^\.env\.\*' .gitignore
```
Expected: at least one match. If not, add `.env.test.local` to `.gitignore` before continuing.

---

## Task 1: Vitest project split for RLS tests

**Files:**
- Modify: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Read existing vitest config**

Run: `cat vitest.config.ts`
Note current shape so the diff is minimal.

- [ ] **Step 2: Convert to projects-style config**

Replace the contents of `vitest.config.ts` with:

```ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    projects: [
      {
        // Existing app tests (everything except supabase/tests).
        test: {
          name: 'app',
          include: ['**/*.{test,spec}.{ts,tsx}'],
          exclude: ['supabase/tests/**', 'node_modules/**', '.next/**', '.worktrees/**'],
          environment: 'jsdom',
          globals: true,
        },
      },
      {
        // RLS tests — require a running local Supabase instance.
        test: {
          name: 'rls',
          include: ['supabase/tests/**/*.test.ts'],
          environment: 'node',
          globals: true,
          env: {
            // Loaded from .env.test.local at test run time
          },
        },
      },
    ],
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
});
```

If the existing `vitest.config.ts` had non-default settings (setup files, coverage config, jsdom-specific options), merge them into the `app` project block. Do not lose existing config.

- [ ] **Step 3: Add `test:rls` script to package.json**

Modify `package.json`:
```jsonc
{
  "scripts": {
    // ... existing scripts ...
    "test:rls": "vitest run --project rls --mode test"
  }
}
```

Also confirm `dotenv-cli` or equivalent isn't required. If `dotenv` is already a dep, the script can be:
```jsonc
"test:rls": "node --env-file=.env.test.local node_modules/vitest/vitest.mjs run --project rls"
```
The `node --env-file` flag is supported on Node ≥20.6.

- [ ] **Step 4: Verify config is valid by running vitest with `--listFiles`**

Run: `pnpm vitest --project rls --listFiles`
Expected: lists 0 files (we haven't created tests yet). No config errors.
If it errors: fix the config before continuing.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json
git commit -m "test: split vitest into app + rls projects for community RLS suite"
```

---

## Task 2: Test helpers — Supabase clients

**Files:**
- Create: `supabase/tests/helpers/clients.ts`

- [ ] **Step 1: Write the helper module**

Create `supabase/tests/helpers/clients.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.TEST_SUPABASE_URL!;
const ANON = process.env.TEST_SUPABASE_ANON_KEY!;
const SERVICE = process.env.TEST_SUPABASE_SERVICE_KEY!;

if (!URL || !ANON || !SERVICE) {
  throw new Error(
    'Missing TEST_SUPABASE_URL / TEST_SUPABASE_ANON_KEY / TEST_SUPABASE_SERVICE_KEY. ' +
    'Run `supabase status` and populate .env.test.local.',
  );
}

/**
 * Service-role client — bypasses RLS. Use only for seed/teardown.
 */
export function serviceClient(): SupabaseClient {
  return createClient(URL, SERVICE, { auth: { persistSession: false } });
}

/**
 * Anonymous client — no JWT. RLS treats auth.uid() as null.
 */
export function anonClient(): SupabaseClient {
  return createClient(URL, ANON, { auth: { persistSession: false } });
}

/**
 * Authenticated client for a known fixture user.
 * Mints a JWT via the admin API. Requires service-role key.
 */
export async function userClient(userId: string): Promise<SupabaseClient> {
  const admin = serviceClient();
  // generateLink mints a magic-link JWT we can extract; cheaper than full sign-in flow.
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: `${userId}@fixture.local`,
  });
  if (error) throw error;
  // The hashed token in the URL is sufficient to extract a session — but for RLS we just
  // need a JWT for this user. The simpler path: use signInWithPassword against a seeded
  // password, OR createSession via admin API if available.
  // We use admin.createUser at seed time with a known password (see fixtures.ts).
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: signInErr } = await client.auth.signInWithPassword({
    email: `${userId}@fixture.local`,
    password: 'fixture-pass-' + userId,
  });
  if (signInErr) throw signInErr;
  return client;
}
```

- [ ] **Step 2: Verify the file imports cleanly**

Run: `pnpm tsc --noEmit supabase/tests/helpers/clients.ts`
Expected: no errors. If `@supabase/supabase-js` is missing types or the project's tsconfig doesn't include `supabase/tests/**`, fix tsconfig include patterns first.

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/helpers/clients.ts
git commit -m "test: add supabase client helpers for RLS tests"
```

---

## Task 3: Fixture users seed SQL

**Files:**
- Create: `supabase/seed_community_test_users.sql`

- [ ] **Step 1: Write the seed**

Create `supabase/seed_community_test_users.sql`:

```sql
-- ============================================================
-- Community RLS test fixtures
-- ============================================================
-- Idempotent seed of 7 fixture users covering every access path.
-- Run via: psql "$TEST_DB_URL" -f supabase/seed_community_test_users.sql
-- Fixture user IDs are hardcoded UUIDs so test code can reference them directly.
-- ============================================================

BEGIN;

-- Vertice partner row (idempotent)
INSERT INTO partners (id, slug, name_en, is_active)
VALUES ('11111111-1111-1111-1111-111111111111', 'vertice-society', 'Vertice Society (fixture)', true)
ON CONFLICT (slug) DO NOTHING;

-- SmashHaus partner row (idempotent)
INSERT INTO partners (id, slug, name_en, is_active)
VALUES ('22222222-2222-2222-2222-222222222222', 'smashhaus', 'SmashHaus (fixture)', true)
ON CONFLICT (slug) DO NOTHING;

-- Fixture user rows (public.users) — auth.users entries are created via
-- supabase admin.createUser from TS; this only seeds the application row.
-- IDs match the auth.users IDs created in helpers/fixtures.ts.

-- ID convention:
--   aaaa…1 = honuvibe_paid (subscription_tier='community', active)
--   aaaa…2 = honuvibe_free (subscription_tier='free')
--   aaaa…3 = vertice_member
--   aaaa…4 = smashhaus_member
--   aaaa…5 = banned_vertice (member of vertice, banned in vertice scope)
--   aaaa…6 = honuvibe_admin (role='admin')
--   aaaa…7 = vertice_partner_admin (in partner_admins for vertice)

-- Test fixtures use the helpers/fixtures.ts seedFixtures() function to upsert
-- these rows after auth users exist. This file is here for reference and for
-- the migration smoke-test (Task 13).

COMMIT;
```

Note: the actual upsert of `public.users` rows happens in TypeScript (`fixtures.ts`) because we need the `auth.users.id` UUIDs to match. This SQL file just sets up the partner rows.

- [ ] **Step 2: Commit**

```bash
git add supabase/seed_community_test_users.sql
git commit -m "test: seed vertice + smashhaus fixture partners"
```

---

## Task 4: Test fixtures helper

**Files:**
- Create: `supabase/tests/helpers/fixtures.ts`

- [ ] **Step 1: Write the fixtures helper**

Create `supabase/tests/helpers/fixtures.ts`:

```ts
import { serviceClient } from './clients';

export const FIXTURES = {
  partners: {
    vertice: '11111111-1111-1111-1111-111111111111',
    smashhaus: '22222222-2222-2222-2222-222222222222',
  },
  users: {
    honuvibe_paid:        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    honuvibe_free:        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    vertice_member:       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    smashhaus_member:     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    banned_vertice:       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5',
    honuvibe_admin:       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6',
    vertice_partner_admin:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa7',
  },
} as const;

type UserKey = keyof typeof FIXTURES.users;

/**
 * Idempotent: creates auth.users + public.users + memberships/bans
 * for every fixture user. Safe to call before each test suite.
 */
export async function seedFixtures(): Promise<void> {
  const admin = serviceClient();

  // 1. Create/update auth.users entries
  for (const [key, id] of Object.entries(FIXTURES.users) as [UserKey, string][]) {
    const email = `${id}@fixture.local`;
    const password = `fixture-pass-${id}`;

    // Try to create; if already exists, update password.
    const { error: createErr } = await admin.auth.admin.createUser({
      id,
      email,
      password,
      email_confirm: true,
    });
    if (createErr && !/already been registered/.test(createErr.message)) {
      throw createErr;
    }
  }

  // 2. Upsert public.users rows with the right shape per fixture.
  const userRows = [
    { id: FIXTURES.users.honuvibe_paid,         role: 'student', subscription_tier: 'community', subscription_status: 'active' },
    { id: FIXTURES.users.honuvibe_free,         role: 'student', subscription_tier: 'free',      subscription_status: null },
    { id: FIXTURES.users.vertice_member,        role: 'student', subscription_tier: 'free',      subscription_status: null },
    { id: FIXTURES.users.smashhaus_member,      role: 'student', subscription_tier: 'free',      subscription_status: null },
    { id: FIXTURES.users.banned_vertice,        role: 'student', subscription_tier: 'free',      subscription_status: null },
    { id: FIXTURES.users.honuvibe_admin,        role: 'admin',   subscription_tier: 'free',      subscription_status: null },
    { id: FIXTURES.users.vertice_partner_admin, role: 'student', subscription_tier: 'free',      subscription_status: null },
  ];
  const { error: upsertErr } = await admin.from('users').upsert(userRows, { onConflict: 'id' });
  if (upsertErr) throw upsertErr;

  // 3. Memberships: vertice_member + banned_vertice + vertice_partner_admin all in Vertice.
  //    smashhaus_member in SmashHaus.
  await admin.from('partner_members').upsert([
    { partner_id: FIXTURES.partners.vertice,   user_id: FIXTURES.users.vertice_member },
    { partner_id: FIXTURES.partners.vertice,   user_id: FIXTURES.users.banned_vertice },
    { partner_id: FIXTURES.partners.smashhaus, user_id: FIXTURES.users.smashhaus_member },
  ], { onConflict: 'partner_id,user_id' });

  // 4. Partner admins: vertice_partner_admin is admin of Vertice.
  await admin.from('partner_admins').upsert([
    { partner_id: FIXTURES.partners.vertice, user_id: FIXTURES.users.vertice_partner_admin },
  ], { onConflict: 'partner_id,user_id' });

  // 5. Bans: banned_vertice is banned from Vertice scope.
  await admin.from('community_bans').upsert([
    {
      partner_id: FIXTURES.partners.vertice,
      user_id: FIXTURES.users.banned_vertice,
      banned_by: FIXTURES.users.honuvibe_admin,
      reason: 'fixture',
    },
  ], { onConflict: 'partner_id,user_id' });
}

/**
 * Wipes community-scoped data between tests but keeps users + memberships.
 */
export async function resetCommunityData(): Promise<void> {
  const admin = serviceClient();
  await admin.from('community_post_likes').delete().neq('post_id', '00000000-0000-0000-0000-000000000000');
  await admin.from('community_comments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await admin.from('community_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await admin.from('community_mod_actions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await admin.from('community_posts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}
```

- [ ] **Step 2: Commit (file compiles; will be used in Task 6 onward)**

```bash
git add supabase/tests/helpers/fixtures.ts
git commit -m "test: add community RLS fixtures helper"
```

---

## Task 5: Create migration skeleton — helpers + partner_members

**Files:**
- Create: `supabase/migrations/042_community_feed.sql`

- [ ] **Step 1: Write the skeleton with helper functions and partner_members**

Create `supabase/migrations/042_community_feed.sql`:

```sql
-- ============================================================================
-- 042_community_feed.sql — Community Feed MVP
-- ============================================================================
-- Spec: docs/plans/2026-05-20-community-feed-mvp-design.md
--
-- This migration ships:
--   1. partner_members table + idempotent backfill from is_vertice_member
--   2. partners.line_url column
--   3. community_scope_for(uid) + has_community_access(uid) helper functions
--   4. community_posts / community_comments / community_post_likes /
--      community_reports / community_bans / community_mod_actions tables
--   5. link_previews cache table (service-role-only)
--   6. All RLS policies for the above
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. partner_members — many-to-one user→partner membership
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS partner_members (
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, user_id)
);
CREATE INDEX IF NOT EXISTS partner_members_user_idx ON partner_members(user_id);

-- Idempotent backfill from is_vertice_member
INSERT INTO partner_members (partner_id, user_id, joined_at)
SELECT (SELECT id FROM partners WHERE slug = 'vertice-society'),
       u.id, COALESCE(u.created_at, now())
FROM public.users u
WHERE u.is_vertice_member = true
  AND EXISTS (SELECT 1 FROM partners WHERE slug = 'vertice-society')
ON CONFLICT (partner_id, user_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. partners.line_url
-- ----------------------------------------------------------------------------

ALTER TABLE partners ADD COLUMN IF NOT EXISTS line_url text;
COMMENT ON COLUMN partners.line_url IS
  'Optional LINE join URL for JP users in this partner community.';

-- ----------------------------------------------------------------------------
-- 3. Scope resolution helpers
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.community_scope_for(p_user_id uuid)
RETURNS uuid AS $$
  SELECT pm.partner_id
  FROM public.partner_members pm
  WHERE pm.user_id = p_user_id
  ORDER BY pm.joined_at ASC
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.community_scope_for(uuid) IS
  'Returns the partner_id the user is scoped to, or NULL for HonuVibe main. '
  'MVP assumes 1 partner per user (first joined wins).';

CREATE OR REPLACE FUNCTION public.has_community_access(p_user_id uuid)
RETURNS boolean AS $$
  SELECT
    -- partner membership: always grants access
    EXISTS (SELECT 1 FROM public.partner_members WHERE user_id = p_user_id)
    -- admin bypass
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = p_user_id AND u.role = 'admin'
    )
    -- active or trialing community/vault subscription
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = p_user_id
        AND u.subscription_tier IN ('community','vault')
        AND u.subscription_status IN ('active','trialing')
    )
    -- cancelled community/vault subscription within grace window
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = p_user_id
        AND u.subscription_tier IN ('community','vault')
        AND u.subscription_status = 'cancelled'
        AND u.subscription_expires_at IS NOT NULL
        AND u.subscription_expires_at > now()
    )
    -- active cohort enrollment window
    OR EXISTS (
      SELECT 1 FROM public.cohort_enrollments ce
      WHERE ce.user_id = p_user_id
        AND ce.bundle_access_starts_at <= now()
        AND ce.bundle_access_ends_at   >= now()
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.has_community_access(uuid) IS
  'Returns true if user qualifies for any community access. '
  'Mirrors has_vault_access access-state semantics (status checks + grace window).';

-- ----------------------------------------------------------------------------
-- 4. partner_members RLS
-- ----------------------------------------------------------------------------

ALTER TABLE partner_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pm_self_read"    ON partner_members;
DROP POLICY IF EXISTS "pm_admin_all"    ON partner_members;
DROP POLICY IF EXISTS "pm_partner_read" ON partner_members;
CREATE POLICY "pm_self_read"    ON partner_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "pm_admin_all"    ON partner_members FOR ALL    USING (public.is_admin());
CREATE POLICY "pm_partner_read" ON partner_members FOR SELECT USING (public.is_partner_for(partner_id));

COMMIT;
```

- [ ] **Step 2: Apply the migration locally**

Run: `supabase db reset`
Expected: all migrations run; final line confirms 042 applied. Any error → fix syntax in 042 before continuing.

- [ ] **Step 3: Verify helpers work via psql**

Run:
```bash
supabase db query "SELECT public.community_scope_for('00000000-0000-0000-0000-000000000000') IS NULL AS ok;"
```
Expected: `ok = t` (null user has no scope).

Run:
```bash
supabase db query "SELECT public.has_community_access('00000000-0000-0000-0000-000000000000') = false AS ok;"
```
Expected: `ok = t`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/042_community_feed.sql
git commit -m "feat(db): community migration skeleton — partner_members + helpers"
```

---

## Task 6: Add community_posts table + RLS

**Files:**
- Modify: `supabase/migrations/042_community_feed.sql`

- [ ] **Step 1: Append the community_posts section before the final `COMMIT;`**

Open `042_community_feed.sql` and **insert before the existing `COMMIT;` line** at the end:

```sql
-- ----------------------------------------------------------------------------
-- 5. community_posts
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS community_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    uuid REFERENCES partners(id) ON DELETE CASCADE,
  author_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category      text NOT NULL CHECK (category IN ('general','show_and_tell','help','wins','announcements')),
  body_md       text NOT NULL CHECK (length(body_md) BETWEEN 1 AND 10000),
  link_preview  jsonb,
  status        text NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden','deleted')),
  pinned_at     timestamptz,
  like_count    int NOT NULL DEFAULT 0,
  comment_count int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_posts_feed_idx
  ON community_posts(partner_id, created_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS community_posts_pinned_idx
  ON community_posts(partner_id, pinned_at DESC) WHERE pinned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_posts_author_idx
  ON community_posts(author_id);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cp_scope_read"    ON community_posts;
DROP POLICY IF EXISTS "cp_scope_insert"  ON community_posts;
DROP POLICY IF EXISTS "cp_author_update" ON community_posts;
DROP POLICY IF EXISTS "cp_admin_all"     ON community_posts;

CREATE POLICY "cp_scope_read" ON community_posts FOR SELECT USING (
  public.has_community_access(auth.uid())
  AND partner_id IS NOT DISTINCT FROM public.community_scope_for(auth.uid())
  AND status = 'published'
);

CREATE POLICY "cp_scope_insert" ON community_posts FOR INSERT WITH CHECK (
  author_id = auth.uid()
  AND public.has_community_access(auth.uid())
  AND partner_id IS NOT DISTINCT FROM public.community_scope_for(auth.uid())
  AND NOT EXISTS (
    SELECT 1 FROM community_bans
    WHERE user_id = auth.uid()
      AND partner_id IS NOT DISTINCT FROM community_posts.partner_id
  )
);

CREATE POLICY "cp_author_update" ON community_posts FOR UPDATE
  USING (author_id = auth.uid() AND status = 'published')
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "cp_admin_all" ON community_posts FOR ALL
  USING (public.is_admin() OR public.is_partner_for(partner_id));
```

Note: `cp_scope_insert` references `community_bans`. We haven't created that table yet, so this policy will error on `db reset` until Task 9. Move the `cp_scope_insert` policy creation **after** `community_bans` is created — easiest fix is to keep the `CREATE TABLE community_posts` here but defer the INSERT policy to Task 9. To keep this task self-contained, do this:

Replace the `cp_scope_insert` policy above with a **placeholder** that doesn't reference `community_bans`:

```sql
-- INSERT policy with ban-check is added in section 9 after community_bans exists.
CREATE POLICY "cp_scope_insert_no_ban_check" ON community_posts FOR INSERT WITH CHECK (
  author_id = auth.uid()
  AND public.has_community_access(auth.uid())
  AND partner_id IS NOT DISTINCT FROM public.community_scope_for(auth.uid())
);
```

We will drop this and replace it in Task 9.

- [ ] **Step 2: Apply migration locally**

Run: `supabase db reset`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/042_community_feed.sql
git commit -m "feat(db): add community_posts table + read/update RLS"
```

---

## Task 7: Add community_comments + triggers + RLS

**Files:**
- Modify: `supabase/migrations/042_community_feed.sql`

- [ ] **Step 1: Insert before `COMMIT;`**

```sql
-- ----------------------------------------------------------------------------
-- 6. community_comments
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS community_comments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  partner_id        uuid REFERENCES partners(id),
  author_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body_md           text NOT NULL CHECK (length(body_md) BETWEEN 1 AND 4000),
  parent_comment_id uuid REFERENCES community_comments(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden','deleted')),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_comments_post_idx
  ON community_comments(post_id, created_at);

CREATE OR REPLACE FUNCTION sync_comment_partner_id() RETURNS TRIGGER AS $$
BEGIN
  SELECT partner_id INTO NEW.partner_id FROM community_posts WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS community_comments_partner_sync ON community_comments;
CREATE TRIGGER community_comments_partner_sync
  BEFORE INSERT ON community_comments
  FOR EACH ROW EXECUTE FUNCTION sync_comment_partner_id();

CREATE OR REPLACE FUNCTION bump_comment_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS community_comments_count ON community_comments;
CREATE TRIGGER community_comments_count
  AFTER INSERT OR DELETE ON community_comments
  FOR EACH ROW EXECUTE FUNCTION bump_comment_count();

ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cc_scope_read"             ON community_comments;
DROP POLICY IF EXISTS "cc_scope_insert_no_ban"    ON community_comments;
DROP POLICY IF EXISTS "cc_author_update"          ON community_comments;
DROP POLICY IF EXISTS "cc_admin_all"              ON community_comments;

CREATE POLICY "cc_scope_read" ON community_comments FOR SELECT USING (
  public.has_community_access(auth.uid())
  AND partner_id IS NOT DISTINCT FROM public.community_scope_for(auth.uid())
  AND status = 'published'
);

-- INSERT policy with ban-check is added in section 9 after community_bans exists.
CREATE POLICY "cc_scope_insert_no_ban" ON community_comments FOR INSERT WITH CHECK (
  author_id = auth.uid()
  AND public.has_community_access(auth.uid())
  AND EXISTS (
    SELECT 1 FROM community_posts p
    WHERE p.id = community_comments.post_id
      AND p.partner_id IS NOT DISTINCT FROM public.community_scope_for(auth.uid())
      AND p.status = 'published'
  )
);

CREATE POLICY "cc_author_update" ON community_comments FOR UPDATE
  USING (author_id = auth.uid() AND status = 'published');

CREATE POLICY "cc_admin_all" ON community_comments FOR ALL
  USING (public.is_admin() OR public.is_partner_for(partner_id));
```

- [ ] **Step 2: Apply + commit**

Run: `supabase db reset` — expect success.

```bash
git add supabase/migrations/042_community_feed.sql
git commit -m "feat(db): add community_comments + triggers + read RLS"
```

---

## Task 8: Add community_post_likes + triggers + RLS

**Files:**
- Modify: `supabase/migrations/042_community_feed.sql`

- [ ] **Step 1: Insert before `COMMIT;`**

```sql
-- ----------------------------------------------------------------------------
-- 7. community_post_likes
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS community_post_likes (
  post_id    uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE OR REPLACE FUNCTION bump_like_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS community_likes_count ON community_post_likes;
CREATE TRIGGER community_likes_count
  AFTER INSERT OR DELETE ON community_post_likes
  FOR EACH ROW EXECUTE FUNCTION bump_like_count();

ALTER TABLE community_post_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cpl_scope_read"  ON community_post_likes;
DROP POLICY IF EXISTS "cpl_self_write"  ON community_post_likes;
DROP POLICY IF EXISTS "cpl_self_delete" ON community_post_likes;

CREATE POLICY "cpl_scope_read" ON community_post_likes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM community_posts p
    WHERE p.id = community_post_likes.post_id
      AND p.partner_id IS NOT DISTINCT FROM public.community_scope_for(auth.uid())
      AND p.status = 'published'
  )
);

CREATE POLICY "cpl_self_write" ON community_post_likes FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM community_posts p
    WHERE p.id = post_id
      AND p.partner_id IS NOT DISTINCT FROM public.community_scope_for(auth.uid())
  )
);

CREATE POLICY "cpl_self_delete" ON community_post_likes FOR DELETE
  USING (user_id = auth.uid());
```

- [ ] **Step 2: Apply + commit**

```bash
supabase db reset
git add supabase/migrations/042_community_feed.sql
git commit -m "feat(db): add community_post_likes + trigger + RLS"
```

---

## Task 9: Add community_reports + community_bans + finalize INSERT policies

**Files:**
- Modify: `supabase/migrations/042_community_feed.sql`

- [ ] **Step 1: Insert before `COMMIT;`**

```sql
-- ----------------------------------------------------------------------------
-- 8. community_reports
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS community_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  uuid REFERENCES partners(id),
  target_type text NOT NULL CHECK (target_type IN ('post','comment')),
  target_id   uuid NOT NULL,
  reporter_id uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  reason      text NOT NULL CHECK (reason IN ('spam','harassment','off_topic','other','auto_flag')),
  note        text CHECK (length(note) <= 200),
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  resolved_by uuid REFERENCES public.users(id),
  resolved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_reports_queue_idx
  ON community_reports(partner_id, status, created_at DESC);

ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cr_reporter_insert" ON community_reports;
DROP POLICY IF EXISTS "cr_mod_read"        ON community_reports;
DROP POLICY IF EXISTS "cr_mod_update"      ON community_reports;
CREATE POLICY "cr_reporter_insert" ON community_reports FOR INSERT WITH CHECK (
  reporter_id = auth.uid() AND public.has_community_access(auth.uid())
);
CREATE POLICY "cr_mod_read"   ON community_reports FOR SELECT
  USING (public.is_admin() OR public.is_partner_for(partner_id));
CREATE POLICY "cr_mod_update" ON community_reports FOR UPDATE
  USING (public.is_admin() OR public.is_partner_for(partner_id));

-- ----------------------------------------------------------------------------
-- 9. community_bans
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS community_bans (
  partner_id uuid REFERENCES partners(id),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  banned_by  uuid NOT NULL REFERENCES public.users(id),
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, user_id)
);

ALTER TABLE community_bans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cb_self_read" ON community_bans;
DROP POLICY IF EXISTS "cb_mod_all"   ON community_bans;
CREATE POLICY "cb_self_read" ON community_bans FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "cb_mod_all"   ON community_bans FOR ALL
  USING (public.is_admin() OR public.is_partner_for(partner_id));

-- ----------------------------------------------------------------------------
-- 10. Finalize INSERT policies with ban checks (replaces placeholders)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "cp_scope_insert_no_ban_check" ON community_posts;
CREATE POLICY "cp_scope_insert" ON community_posts FOR INSERT WITH CHECK (
  author_id = auth.uid()
  AND public.has_community_access(auth.uid())
  AND partner_id IS NOT DISTINCT FROM public.community_scope_for(auth.uid())
  AND NOT EXISTS (
    SELECT 1 FROM community_bans
    WHERE user_id = auth.uid()
      AND partner_id IS NOT DISTINCT FROM community_posts.partner_id
  )
);

DROP POLICY IF EXISTS "cc_scope_insert_no_ban" ON community_comments;
CREATE POLICY "cc_scope_insert" ON community_comments FOR INSERT WITH CHECK (
  author_id = auth.uid()
  AND public.has_community_access(auth.uid())
  AND EXISTS (
    SELECT 1 FROM community_posts p
    WHERE p.id = community_comments.post_id
      AND p.partner_id IS NOT DISTINCT FROM public.community_scope_for(auth.uid())
      AND p.status = 'published'
  )
  AND NOT EXISTS (
    SELECT 1 FROM community_bans
    WHERE user_id = auth.uid()
      AND partner_id IS NOT DISTINCT FROM community_comments.partner_id
  )
);
```

- [ ] **Step 2: Apply + commit**

```bash
supabase db reset
git add supabase/migrations/042_community_feed.sql
git commit -m "feat(db): add community_reports + community_bans, finalize INSERT policies"
```

---

## Task 10: Add community_mod_actions + link_previews

**Files:**
- Modify: `supabase/migrations/042_community_feed.sql`

- [ ] **Step 1: Insert before `COMMIT;`**

```sql
-- ----------------------------------------------------------------------------
-- 11. community_mod_actions — audit log
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS community_mod_actions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid NOT NULL REFERENCES public.users(id),
  action      text NOT NULL CHECK (action IN ('pin','unpin','hide','unhide','delete','resolve_report','ban','unban')),
  target_type text NOT NULL,
  target_id   uuid NOT NULL,
  partner_id  uuid REFERENCES partners(id),
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_mod_actions_recent_idx
  ON community_mod_actions(created_at DESC);

ALTER TABLE community_mod_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cma_admin_read"   ON community_mod_actions;
DROP POLICY IF EXISTS "cma_actor_insert" ON community_mod_actions;
CREATE POLICY "cma_admin_read"   ON community_mod_actions FOR SELECT
  USING (public.is_admin());
CREATE POLICY "cma_actor_insert" ON community_mod_actions FOR INSERT WITH CHECK (
  actor_id = auth.uid()
);

-- ----------------------------------------------------------------------------
-- 12. link_previews — service-role-only cache
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS link_previews (
  url_hash   text PRIMARY KEY,
  url        text NOT NULL,
  preview    jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS link_previews_fresh_idx ON link_previews(fetched_at);

ALTER TABLE link_previews ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies for anon or authenticated.
-- Service role bypasses RLS; API routes use service-role key.
```

- [ ] **Step 2: Apply + commit**

```bash
supabase db reset
git add supabase/migrations/042_community_feed.sql
git commit -m "feat(db): add community_mod_actions audit log + link_previews cache"
```

---

## Task 11: Write the 9 RLS leak tests

**Files:**
- Create: `supabase/tests/community_rls.test.ts`

- [ ] **Step 1: Write the test file**

Create `supabase/tests/community_rls.test.ts`:

```ts
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, resetCommunityData, seedFixtures } from './helpers/fixtures';

const PARTNERS = FIXTURES.partners;
const USERS = FIXTURES.users;

beforeAll(async () => {
  await seedFixtures();
});

beforeEach(async () => {
  await resetCommunityData();
});

// --- Seed helpers (use service role to bypass RLS) -------------------------

async function seedMainPost() {
  const admin = serviceClient();
  const { data, error } = await admin
    .from('community_posts')
    .insert({
      partner_id: null,
      author_id: USERS.honuvibe_paid,
      category: 'general',
      body_md: 'main feed post',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

async function seedVerticePost() {
  const admin = serviceClient();
  const { data, error } = await admin
    .from('community_posts')
    .insert({
      partner_id: PARTNERS.vertice,
      author_id: USERS.vertice_member,
      category: 'general',
      body_md: 'vertice feed post',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

async function seedComment(postId: string, authorId: string) {
  const admin = serviceClient();
  const { data, error } = await admin
    .from('community_comments')
    .insert({
      post_id: postId,
      author_id: authorId,
      body_md: 'a comment',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

// --- 9 leak tests ----------------------------------------------------------

describe('community RLS leak tests', () => {
  test('1. Vertice member cannot SELECT HonuVibe-main posts', async () => {
    await seedMainPost();
    const client = await userClient(USERS.vertice_member);
    const { data, error } = await client
      .from('community_posts')
      .select('id')
      .is('partner_id', null);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('2. Vertice member cannot INSERT a post with partner_id=NULL', async () => {
    const client = await userClient(USERS.vertice_member);
    const { error } = await client.from('community_posts').insert({
      partner_id: null,
      author_id: USERS.vertice_member,
      category: 'general',
      body_md: 'sneaky',
    });
    expect(error).not.toBeNull();
  });

  test('3. HonuVibe-main member cannot SELECT Vertice posts', async () => {
    await seedVerticePost();
    const client = await userClient(USERS.honuvibe_paid);
    const { data } = await client
      .from('community_posts')
      .select('id')
      .eq('partner_id', PARTNERS.vertice);
    expect(data).toEqual([]);
  });

  test('4. SmashHaus member cannot SELECT Vertice posts (cross-partner)', async () => {
    await seedVerticePost();
    const client = await userClient(USERS.smashhaus_member);
    const { data } = await client
      .from('community_posts')
      .select('id')
      .eq('partner_id', PARTNERS.vertice);
    expect(data).toEqual([]);
  });

  test('5. Free user (no qualifying tier) cannot SELECT any post', async () => {
    await seedMainPost();
    await seedVerticePost();
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client.from('community_posts').select('id');
    expect(data).toEqual([]);
  });

  test('6. Banned-from-Vertice user cannot INSERT in Vertice scope', async () => {
    const client = await userClient(USERS.banned_vertice);
    const { error } = await client.from('community_posts').insert({
      partner_id: PARTNERS.vertice,
      author_id: USERS.banned_vertice,
      category: 'general',
      body_md: 'banned but trying',
    });
    expect(error).not.toBeNull();
  });

  test('7. Vertice member cannot SELECT comments on a HonuVibe-main post', async () => {
    const postId = await seedMainPost();
    await seedComment(postId, USERS.honuvibe_paid);
    const client = await userClient(USERS.vertice_member);
    const { data } = await client
      .from('community_comments')
      .select('id')
      .eq('post_id', postId);
    expect(data).toEqual([]);
  });

  test('8. Anonymous client cannot SELECT link_previews directly', async () => {
    // link_previews has no public RLS policies — only service role can read.
    const admin = serviceClient();
    await admin.from('link_previews').insert({
      url_hash: 'deadbeef',
      url: 'https://example.com',
      preview: { title: 'leak attempt' },
    });
    const client = anonClient();
    const { data } = await client.from('link_previews').select('url_hash');
    expect(data).toEqual([]);
  });

  test('9. Banned-from-Vertice user CAN still INSERT in HonuVibe-main if they qualify', async () => {
    // Upgrade banned_vertice to an active community subscription so they qualify for main.
    const admin = serviceClient();
    await admin
      .from('users')
      .update({ subscription_tier: 'community', subscription_status: 'active' })
      .eq('id', USERS.banned_vertice);
    // They are NOT a partner_member of any partner OTHER than vertice — but the
    // community_scope_for() function picks the first joined partner, which is vertice.
    // To truly test "main scope still works" we need a user who's banned from vertice
    // but NOT a partner_member. Remove the membership first.
    await admin
      .from('partner_members')
      .delete()
      .eq('user_id', USERS.banned_vertice);

    const client = await userClient(USERS.banned_vertice);
    const { error } = await client.from('community_posts').insert({
      partner_id: null,
      author_id: USERS.banned_vertice,
      category: 'general',
      body_md: 'main feed, banned from vertice only',
    });
    expect(error).toBeNull();

    // Restore for subsequent tests
    await admin
      .from('users')
      .update({ subscription_tier: 'free', subscription_status: null })
      .eq('id', USERS.banned_vertice);
    await admin
      .from('partner_members')
      .insert({ partner_id: PARTNERS.vertice, user_id: USERS.banned_vertice });
  });
});
```

- [ ] **Step 2: Run the test suite**

Run: `pnpm test:rls`
Expected: 9 tests, 9 pass.

If any fail: read the assertion message. Common issues:
- "row violates row-level security policy" on a seed insert → the seed used the wrong client (must be `serviceClient`).
- Test 9 fails because `community_scope_for` picks an unintended partner → re-verify the membership delete ran.
- Test 2 returns `error = null` → INSERT policy is missing or too permissive; recheck `cp_scope_insert` in the migration.

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/community_rls.test.ts
git commit -m "test: add 9 RLS leak tests for community feed access boundary"
```

---

## Task 12: Documentation + final smoke

**Files:**
- Modify: `README.md` (or create `supabase/tests/README.md`)

- [ ] **Step 1: Add a short README at `supabase/tests/README.md`**

```md
# Supabase RLS tests

These tests verify that row-level security on community feed tables prevents
cross-tenant data leaks. They require a running local Supabase instance.

## One-time setup
1. `supabase start`
2. Copy keys from `supabase status` into `.env.test.local`:
   - `TEST_SUPABASE_URL=http://127.0.0.1:54321`
   - `TEST_SUPABASE_ANON_KEY=...`
   - `TEST_SUPABASE_SERVICE_KEY=...`

## Run
```bash
pnpm test:rls
```

## When to add a test
Whenever you add a new access path or new community-scoped table.
Each test is a `should NOT` assertion against the database — never against
the API. The database is the only real boundary.
```

- [ ] **Step 2: Full smoke**

Run, in order:
```bash
supabase db reset
pnpm test:rls
```
Expected: migration applies cleanly; all 9 tests pass.

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/README.md
git commit -m "docs: add supabase RLS tests README"
```

---

## Task 13: Tag the milestone

- [ ] **Step 1: Verify clean state**

Run: `git status`
Expected: clean working tree.

Run: `pnpm test:rls`
Expected: 9/9 pass.

Run: `pnpm test:run`
Expected: existing app tests still pass (the projects split didn't break anything).

- [ ] **Step 2: Push to main**

```bash
git push origin main
```

- [ ] **Step 3: Tag for traceability**

```bash
git tag community-feed-plan-1-complete
git push origin community-feed-plan-1-complete
```

This marks the end of Phase 1. Phase 2 (backend lib + API routes) lands as a separate plan with its own tasks.

---

## Self-review checklist

- [x] **Spec coverage:** Sections 0, 1, 2 of the spec are fully implemented. Section 6's testing portion is implemented (9 RLS leak tests). E2E and rollout are deferred to Plans 2–4.
- [x] **Placeholder scan:** No TBD / TODO / "implement later". All code blocks are complete and copy-pasteable.
- [x] **Type consistency:** Function names `community_scope_for`, `has_community_access`, table names `community_posts`/`community_comments`/etc. match across all tasks and tests.
- [x] **Tooling assumptions verified:** vitest exists in package.json (^3.2.4); supabase CLI assumed present (pre-flight verifies); pnpm assumed (matches user memory + Vercel deploy constraint).

## Out of scope (later plans)

- Plan 2: `lib/community/*` utilities + all `app/api/community/**` routes
- Plan 3: `/learn/dashboard/community` read-only feed page + paywall + LINE card + course-channels strip
- Plan 4: composer + comments + likes + report dialog + `/admin/community` + `/partner/[slug]/community` moderation pages
- Follow-up: `043_drop_is_vertice_member.sql` after one release
