# Supabase RLS tests

These tests verify that row-level security on community-feed tables prevents
cross-tenant data leaks. They require a running local Supabase instance.

## One-time setup

1. Start Docker Desktop.
2. Run `supabase start` (first run pulls ~2GB of container images).
3. Copy the keys from `supabase status` into `.env.test.local` (gitignored):
   ```
   TEST_SUPABASE_URL=http://127.0.0.1:54321
   TEST_SUPABASE_ANON_KEY=<from supabase status>
   TEST_SUPABASE_SERVICE_KEY=<from supabase status>
   ```

## Run

```bash
pnpm test:rls
```

## What's covered

`community_rls.test.ts` runs 9 `should NOT` assertions against the database
directly (not the API). The database is the only real boundary; if these
ever pass-when-they-should-fail, CI breaks.

1. Vertice member cannot SELECT HonuVibe-main posts
2. Vertice member cannot INSERT a post with `partner_id = NULL`
3. HonuVibe-main member cannot SELECT Vertice posts
4. SmashHaus member cannot SELECT Vertice posts (cross-partner)
5. Free user cannot SELECT any post
6. Banned-from-Vertice user cannot INSERT in Vertice scope
7. Vertice member cannot SELECT comments on a HonuVibe-main post
8. Anonymous client cannot SELECT link_previews directly
9. Banned-from-Vertice user CAN still INSERT in HonuVibe-main if they qualify
   (per-partner ban scope)

## When to add a test

Whenever you add a new access path or a new community-scoped table.
Each test goes against the database, never the API.
