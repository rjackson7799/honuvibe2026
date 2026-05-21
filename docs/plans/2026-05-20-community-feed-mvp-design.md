# Community Feed MVP — Design

**Date:** 2026-05-20
**Status:** Design (pre-implementation plan)
**Owner:** Ryan
**Next step:** writing-plans skill produces the file-by-file build plan

---

## Context

The current `/learn/dashboard/community` page ([app/[locale]/learn/dashboard/community/page.tsx](../../app/[locale]/learn/dashboard/community/page.tsx)) is a stub: it only surfaces external Discord/Slack/Zoom links attached to courses the user is enrolled in. There is no native community surface.

We already sell a `community` subscription tier ([migration 036](../../supabase/migrations/036_subscription_tier_to_vault.sql)) but it grants nothing today. We need a Skool-style native community feed to back that tier, scaled to ship in weeks not months. Japanese users additionally see a persistent LINE join card (LINE is the dominant chat platform in JP).

A core requirement: **partner-tenanted communities**. Vertice Society members see only the Vertice feed. SmashHaus members (future) see only the SmashHaus feed. HonuVibe paid members see only the main HonuVibe feed. Each partner is a walled garden.

This is the **first slice** of a larger community roadmap. Out of scope here (future specs): members directory, leaderboards, notifications/digests, DMs, multi-space, search, image upload, realtime updates.

---

## Section 0 — Access Boundary

The single most important section. Defines exactly what is protected, where it is enforced, and what happens on a failed check. Everything else in the spec serves this table.

| Surface | Visibility | Enforced by | On unauthorized access |
|---|---|---|---|
| Category enum list | Authenticated, any tier | App layer constant | N/A (compile-time) |
| Partner branding (name, colors, LINE URL) | Authenticated within scope | RLS on `partners` (existing) + scope helper | Falls back to HonuVibe brand |
| Post bodies, post metadata | Scope-gated (member of the partner the post belongs to) | **RLS on `community_posts`** | Row not returned (404 at app layer) |
| Comment bodies | Scope-gated via parent post | **RLS on `community_comments`** | Row not returned |
| Like counts (aggregate) | Same as post | Denormalized on `community_posts.like_count` | N/A |
| Like rows (who liked what) | Scope-gated | **RLS on `community_post_likes`** via post join | Row not returned |
| Link preview cache rows | Scope-gated via referencing post | **RLS on `link_previews`** (service-role only); app calls via API | 403 from API |
| Report queue | HonuVibe admins + partner admins for their partner only | **RLS on `community_reports`** | Empty result |
| Ban list | Same as report queue | **RLS on `community_bans`** | Empty result |
| Mod action audit log | HonuVibe admins only | **RLS on `community_mod_actions`** | Empty result |
| Composer (write surface) | Scope-gated, not banned | RLS `INSERT` policy + app-layer paywall | Paywall page (free) or banned banner (banned) |
| Free user on `/learn/dashboard/community` | — | App-layer scope check before render | Paywall page (no RLS error surfaced) |

**Two-layer rule:** every protected surface has both RLS (real boundary; prevents leaks if app has bugs) and an app-layer check (clean UX). RLS is authoritative.

**Scope resolution function** — single source of truth, defined in Postgres:

```sql
CREATE OR REPLACE FUNCTION public.community_scope_for(p_user_id uuid)
RETURNS uuid AS $$
  SELECT pm.partner_id
  FROM public.partner_members pm
  WHERE pm.user_id = p_user_id
  ORDER BY pm.joined_at ASC
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.has_community_access(p_user_id uuid)
RETURNS boolean AS $$
  SELECT
    -- partner membership: always grants access (partner deal is off-platform)
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
```

Every RLS policy combines these: `has_community_access` gates whether the user plays at all; `community_scope_for` gates which sandbox.

---

## Section 1 — Data Model

**Migration:** `042_community_feed.sql` (040 and 041 are taken by the vault redesign).

### New table: `partner_members`

```sql
CREATE TABLE partner_members (
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, user_id)
);
CREATE INDEX partner_members_user_idx ON partner_members(user_id);

-- Idempotent backfill from is_vertice_member
INSERT INTO partner_members (partner_id, user_id, joined_at)
SELECT (SELECT id FROM partners WHERE slug = 'vertice-society'),
       u.id, COALESCE(u.created_at, now())
FROM public.users u
WHERE u.is_vertice_member = true
ON CONFLICT (partner_id, user_id) DO NOTHING;
```

`is_vertice_member` column is kept for one release as a fallback, then dropped in migration `042_drop_is_vertice_member.sql` (out of scope of this design; tracked as a follow-up TODO).

### New table: `community_posts`

```sql
CREATE TABLE community_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    uuid REFERENCES partners(id) ON DELETE CASCADE,  -- NULL = HonuVibe main
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
CREATE INDEX community_posts_feed_idx   ON community_posts(partner_id, created_at DESC) WHERE status = 'published';
CREATE INDEX community_posts_pinned_idx ON community_posts(partner_id, pinned_at  DESC) WHERE pinned_at IS NOT NULL;
CREATE INDEX community_posts_author_idx ON community_posts(author_id);
```

### New table: `community_comments`

```sql
CREATE TABLE community_comments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  partner_id        uuid REFERENCES partners(id),  -- denormalized from post (RLS perf)
  author_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body_md           text NOT NULL CHECK (length(body_md) BETWEEN 1 AND 4000),
  parent_comment_id uuid REFERENCES community_comments(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden','deleted')),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX community_comments_post_idx ON community_comments(post_id, created_at);

-- Triggers: sync partner_id, maintain comment_count
CREATE OR REPLACE FUNCTION sync_comment_partner_id() RETURNS TRIGGER AS $$
BEGIN
  SELECT partner_id INTO NEW.partner_id FROM community_posts WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
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
CREATE TRIGGER community_comments_count
  AFTER INSERT OR DELETE ON community_comments
  FOR EACH ROW EXECUTE FUNCTION bump_comment_count();
```

### New table: `community_post_likes`

```sql
CREATE TABLE community_post_likes (
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
CREATE TRIGGER community_likes_count
  AFTER INSERT OR DELETE ON community_post_likes
  FOR EACH ROW EXECUTE FUNCTION bump_like_count();
```

### New tables: reports, bans, audit log, link previews

```sql
CREATE TABLE community_reports (
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
CREATE INDEX community_reports_queue_idx ON community_reports(partner_id, status, created_at DESC);

CREATE TABLE community_bans (
  partner_id uuid REFERENCES partners(id),  -- NULL = banned from HonuVibe main
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  banned_by  uuid NOT NULL REFERENCES public.users(id),
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, user_id)
);

CREATE TABLE community_mod_actions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid NOT NULL REFERENCES public.users(id),
  action      text NOT NULL CHECK (action IN ('pin','unpin','hide','unhide','delete','resolve_report','ban','unban')),
  target_type text NOT NULL,
  target_id   uuid NOT NULL,
  partner_id  uuid REFERENCES partners(id),
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX community_mod_actions_recent_idx ON community_mod_actions(created_at DESC);

CREATE TABLE link_previews (
  url_hash   text PRIMARY KEY,        -- sha256(url) hex
  url        text NOT NULL,
  preview    jsonb NOT NULL,          -- {title,description,image,site} or {error:'...'}
  fetched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX link_previews_fresh_idx ON link_previews(fetched_at);
```

Cache TTL = 7 days; refresh logic in API route. RLS on `link_previews` is service-role-only.

### Add column: `partners.line_url`

```sql
ALTER TABLE partners ADD COLUMN IF NOT EXISTS line_url text;
COMMENT ON COLUMN partners.line_url IS 'Optional LINE join URL for JP users in this partner community';
```

### Schema notes

- Categories are a hardcoded enum (CHECK constraint + `messages/*.json`). Adding a category = migration + label key.
- All bilingual user content stored as authored (single `body_md`). We do not auto-translate.
- `partner_id IS NULL` means HonuVibe main throughout. All policies use `IS NOT DISTINCT FROM` for NULL-safe equality.

---

## Section 2 — Access Control & RLS

### Policies

```sql
ALTER TABLE partner_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_self_read"    ON partner_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "pm_admin_all"    ON partner_members FOR ALL    USING (public.is_admin());
CREATE POLICY "pm_partner_read" ON partner_members FOR SELECT USING (public.is_partner_for(partner_id));

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
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

ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_scope_read" ON community_comments FOR SELECT USING (
  public.has_community_access(auth.uid())
  AND partner_id IS NOT DISTINCT FROM public.community_scope_for(auth.uid())
  AND status = 'published'
);
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
CREATE POLICY "cc_author_update" ON community_comments FOR UPDATE
  USING (author_id = auth.uid() AND status = 'published');
CREATE POLICY "cc_admin_all" ON community_comments FOR ALL
  USING (public.is_admin() OR public.is_partner_for(partner_id));

ALTER TABLE community_post_likes ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY "cpl_self_delete" ON community_post_likes FOR DELETE USING (user_id = auth.uid());

ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cr_reporter_insert" ON community_reports FOR INSERT WITH CHECK (
  reporter_id = auth.uid() AND public.has_community_access(auth.uid())
);
CREATE POLICY "cr_mod_read"   ON community_reports FOR SELECT USING (public.is_admin() OR public.is_partner_for(partner_id));
CREATE POLICY "cr_mod_update" ON community_reports FOR UPDATE USING (public.is_admin() OR public.is_partner_for(partner_id));

ALTER TABLE community_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cb_self_read" ON community_bans FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "cb_mod_all"   ON community_bans FOR ALL    USING (public.is_admin() OR public.is_partner_for(partner_id));

ALTER TABLE community_mod_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cma_admin_read"   ON community_mod_actions FOR SELECT USING (public.is_admin());
CREATE POLICY "cma_actor_insert" ON community_mod_actions FOR INSERT WITH CHECK (actor_id = auth.uid());

ALTER TABLE link_previews ENABLE ROW LEVEL SECURITY;
-- No public policies; only service role reads/writes. API authorizes per-request.
```

### App-layer scope helper

`lib/community/scope.ts`:

```ts
export type CommunityScope = {
  partnerId: string | null;     // null = HonuVibe main
  partner: Partner | null;      // brand info if non-main
};

export async function getCommunityScope(supabase: SupabaseClient): Promise<CommunityScope | null>;
export async function requireCommunityScope(supabase: SupabaseClient): Promise<CommunityScope>;
```

Mirrors `lib/vault/access.ts` patterns. Server-side only.

### Paywall page

When `getCommunityScope()` returns `null`, render `<CommunityPaywall />` with three CTAs in priority order:
1. Subscribe — Community tier (primary; price TBD, confirm with Ryan)
2. Subscribe — Vault tier (includes community)
3. Browse courses (every course grants community access)

---

## Section 3 — Routes & Components

### Page routes

| Path | Purpose |
|---|---|
| `/learn/dashboard/community` | Feed page (replaces stub) |
| `/learn/dashboard/community/[postId]` | Single post + comments |
| `/admin/community` | HonuVibe admin moderation (all scopes) |
| `/partner/[slug]/community` | Partner admin moderation (own scope only) |

### API routes (`app/api/community/`)

| Method | Path | Purpose |
|---|---|---|
| GET    | `/feed?cursor=&category=` | Paginated feed; 20 per page; cursor = post id |
| POST   | `/posts` | Create post; auto-stamps `partner_id` |
| GET    | `/posts/[id]` | Single post + comments |
| PATCH  | `/posts/[id]` | Edit own post (within 15min); admin can pin/hide |
| DELETE | `/posts/[id]` | Soft delete (author or admin) |
| POST   | `/posts/[id]/pin` | Admin pin (unpins any current pinned in scope) |
| POST   | `/posts/[id]/hide` | Admin hide |
| POST   | `/posts/[id]/comments` | Add comment |
| PATCH  | `/comments/[id]` | Edit own comment |
| DELETE | `/comments/[id]` | Delete (author or admin) |
| POST   | `/posts/[id]/like` | Like |
| DELETE | `/posts/[id]/like` | Unlike |
| POST   | `/reports` | File report (rate-limited 5/hr/user) |
| PATCH  | `/reports/[id]` | Mod resolves |
| POST   | `/bans` | Mod ban |
| DELETE | `/bans/[user_id]?partner_id=` | Mod unban |
| POST   | `/link-preview` | Server-side OG fetcher (rate-limited 30/hr/user) |

All routes: require auth (401 if missing); call `requireCommunityScope()` first (402 → paywall redirect at client); mod-only routes additionally check `is_admin()` or `is_partner_for()`.

### Components (`components/community/`)

```
CommunityFeed.tsx           Server — fetches first page, renders shell
CommunityFeedClient.tsx     Client — infinite scroll, optimistic likes, category filter
CourseChannelsStrip.tsx     Server — horizontal strip of existing course Discord/Zoom links above feed
PostComposer.tsx            Client — markdown textarea + link preview fetch
PostCard.tsx                Server — one post in feed
PostDetail.tsx              Server — full post + comments
CommentThread.tsx           Client — comment list + composer; 1-level nesting
LikeButton.tsx              Client — optimistic toggle
PostMenu.tsx                Client — report / pin / hide / delete
CommunityPaywall.tsx        Server — shown for no-access users
LineJoinCard.tsx            Server — JP-only banner at top
CategoryChips.tsx           Client — filter chips → ?category= query
EmptyFeed.tsx               Server — "Be the first to post"
BannedBanner.tsx            Server — shown if user is banned from this scope
ReportDialog.tsx            Client — reason radio + 200-char note
```

### Utilities (`lib/community/`)

```
scope.ts          getCommunityScope, requireCommunityScope
queries.ts        listFeed, getPost, listComments, listReports, etc.
mutations.ts      createPost, addComment, toggleLike, pin, hide, ban, etc.
markdown.ts       renderMarkdown(body) via react-markdown + rehype-sanitize + remark-gfm
link-preview.ts   fetchLinkPreview(url): SSRF guard, 2MB cap, 5s timeout, 7d cache
moderation.ts     ModerationDashboard data source (shared by admin + partner pages)
rate-limit.ts     In-memory token bucket per user; swap to Vercel KV later
types.ts          Post, Comment, Scope, LinkPreview, Report, Ban, ModAction
```

### Nav

Existing left-rail "Community" link in `StudentDashboardLayout` keeps URL + active-state styling. No new nav slot.

### JP rendering

`CommunityFeed.tsx` reads `locale`; when `'ja'`, renders `<LineJoinCard partnerId={scope.partnerId} />` above the composer. `LineJoinCard` resolves the LINE URL:
1. `partners.line_url` if `partnerId` non-null
2. Else `process.env.NEXT_PUBLIC_HONUVIBE_LINE_URL`
3. Else card not rendered

`partners.line_url` is admin-editable via existing partner CRUD; no new admin surface.

### Course-channels strip

Keep [app/api/dashboard/community/route.ts](../../app/api/dashboard/community/route.ts) alive and render existing course-channel cards as a single horizontal strip (`<CourseChannelsStrip />`) above the feed for users with any course channels. ~30 lines of presentation; no new sidebar component.

---

## Section 4 — Posting Flow & Link Previews

### Composer

- Single textarea, auto-grow (~6 rows). No toolbar.
- Hint text: "Markdown supported. Be kind."
- Category dropdown above textarea (default: General).
- Submit on `cmd/ctrl + Enter` or button click. Disabled until non-whitespace content.
- DB enforces `length(body_md) BETWEEN 1 AND 10000`.
- Optimistic prepend; reconcile with server response.

### Link preview flow

1. Debounced 400ms regex extracts the first `https?://...` URL in body.
2. If URL changed, client `POST /api/community/link-preview { url }`.
3. Server route:
   - SHA-256 the URL; lookup `link_previews` cache. If ≤ 7 days old, return cached.
   - Else `fetchLinkPreview(url)` in `lib/community/link-preview.ts`:
     - **SSRF guard**: parse URL; reject if hostname resolves to RFC1918 / loopback / link-local / IPv6 unique local / IPv4-mapped. Resolve DNS, validate first A/AAAA against blocklist before fetch.
     - 5s timeout, 2MB max read, abort on non-`text/html` content-type.
     - Max 3 redirects; re-validate each against SSRF guard.
     - `User-Agent: HonuVibeBot/1.0 (+https://honuvibe.ai)`.
     - Parse with `cheerio`: `og:title`, `og:description`, `og:image`, `og:site_name`; fall back to `<title>` / `<meta name="description">`.
     - Validate image URL: must be `https`, must pass SSRF guard.
   - Upsert into `link_previews` (success or `{error:'...'}` — avoids retry storms).
   - Return preview to client.
4. Client renders preview card; [x] dismisses (`linkPreview: null` on payload).
5. On post submit, the (possibly dismissed) preview is stored on `community_posts.link_preview`.

Rate limit: 30 previews/hr/user via `lib/community/rate-limit.ts`.

**Deferred hardening:** DNS rebinding protection. Revisit when feature has >100 active users.

### Markdown rendering

Server-rendered via `react-markdown` + `rehype-sanitize` (default schema, plus explicit removal of `<iframe>`, `<script>`, `<style>`, all `on*` handlers, `javascript:` and `data:` URLs except `data:image/png|jpeg|webp;base64`). `remark-gfm` for tables, autolinks, strikethrough.

All rendered hyperlinks get `rel="noopener nofollow ugc" target="_blank"`.

### Spam pre-flag (soft)

On insert, tiny regex against `body_md`:
- ≥5 URLs
- Configurable keyword list (initially empty)

If matched, insert succeeds **and** a `community_reports` row is auto-written with `reason='auto_flag'`. Post is visible immediately; mod queue surfaces it.

### Edit / delete

- Edit own post within 15 minutes of `created_at`. UI hides edit button after; API rejects POSTs >15min with 403. RLS doesn't enforce the time window (slow); app layer is authoritative for the cutoff.
- Delete own post anytime → `status='deleted'`. Body displays `[deleted by author]`. Row preserved for audit.
- Edited posts show an `edited` label.

### Comments

Same composer mechanics. Max 4000 chars. One level of nesting only — clicking "Reply" on a child comment creates a sibling, not a grandchild. Same 15-minute author-edit window as posts (UI hides button after; API rejects with 403).

---

## Section 5 — Moderation Surface

### Routes

| Path | Who | Scope |
|---|---|---|
| `/admin/community`           | `is_admin()`                     | All partners + main |
| `/partner/[slug]/community`  | `is_partner_for(partner.id)`     | One partner |

Same React tree; RLS does scoping.

### Page (`components/admin/community/ModerationDashboard.tsx`)

Three tabs:
1. **Reports** (default) — open reports, newest first. Actions per row: [View] [Hide] [Dismiss] [Ban author].
2. **All posts** — chronological. Filters: category, author, status. Actions: [Pin] [Hide] [Delete] [Ban].
3. **Banned users** — list in scope. Action: [Unban].

No bulk actions at MVP.

### Audit log

Every mod action writes one `community_mod_actions` row. `metadata` jsonb holds action-specific context (e.g., `{"reason":"spam"}`, `{"previous_pinned_post_id":"..."}`). Not surfaced in UI at MVP; SQL-queryable.

### Pin semantics

Only one pinned post per scope. Pinning wraps in a transaction:
```sql
BEGIN;
UPDATE community_posts SET pinned_at = NULL  WHERE partner_id IS NOT DISTINCT FROM $1 AND pinned_at IS NOT NULL;
UPDATE community_posts SET pinned_at = now() WHERE id = $2;
COMMIT;
```
Feed ORDER BY: `pinned_at DESC NULLS LAST, created_at DESC`.

### Hide vs delete

- **Hide**: reversible. Author sees post with "Hidden by moderator" banner; others see nothing.
- **Delete**: irreversible from UI. Body replaced with `[removed by moderator]` for everyone.

### Ban semantics

Per-partner. Vertice ban does not prevent posting in HonuVibe main if user qualifies there. Ban does not delete existing posts.

### Notifications

None at MVP. Mods check the dashboard. Email digest is a future spec.

---

## Section 6 — Testing, Rollout, Analytics

### Testing layers

| Layer | What | Where |
|---|---|---|
| Unit | `community_scope_for`, `has_community_access`, markdown sanitizer XSS strings, SSRF guard private-IP cases, spam regex | `lib/community/__tests__/*.test.ts` |
| RLS integration (critical) | 9 leak-vector tests below | `supabase/tests/community_rls.test.ts` |
| E2E smoke | Sign in → see scoped feed → post → like → comment → admin hide → author sees hidden banner | Playwright spec or manual checklist |

### Nine RLS leak tests

Each is a `should NOT` assertion:

1. Vertice member cannot SELECT HonuVibe-main posts
2. Vertice member cannot INSERT a post with `partner_id = NULL`
3. HonuVibe-main member cannot SELECT Vertice posts
4. SmashHaus member cannot SELECT Vertice posts (cross-partner)
5. Free user (no qualifying tier/membership) cannot SELECT any post
6. Banned-from-Vertice user cannot INSERT in Vertice scope
7. Vertice member cannot SELECT comments on a HonuVibe-main post (via post join)
8. Vertice member cannot SELECT a `link_previews` row referenced only by a HonuVibe-main post (service-role gate via API)
9. Banned-from-Vertice user CAN still SELECT and INSERT in HonuVibe-main if they qualify (per-partner ban scope)

Run against a seeded test DB. Any one passing-when-it-should-fail → CI fail.

### Rollout (sequential commits to main)

1. **Migration** — `042_community_feed.sql`. Deploy. Smoke-test on prod.
2. **Backend** — `lib/community/*` + all API routes. Deploy. Curl with a test user.
3. **Frontend (read-only)** — feed page rendering posts, no composer or comments. Seed 3 HonuVibe posts via SQL. Verify scope rendering across Vertice / main / free in real browsers.
4. **Frontend (write)** — composer, comments, likes, moderation pages. Deploy. Announce.

Forward-only rollback: steps 2–4 are pure frontend. Step 1 rollback is `DROP TABLE` on tables with no users.

### Analytics events (add to [lib/analytics.ts](../../lib/analytics.ts))

- `community_post_created` — `{ partner_scope, category, body_length, has_link_preview }`
- `community_comment_created` — `{ partner_scope, post_id }`
- `community_post_liked` — `{ partner_scope }`
- `community_post_reported` — `{ partner_scope, reason }`
- `community_paywall_viewed` — `{ referrer_path }`
- `community_paywall_cta_clicked` — `{ cta: 'community_tier' | 'vault_tier' | 'course' }`
- `line_join_card_clicked` — `{ partner_scope }`

### Performance budgets

- Feed page initial JS over dashboard shell: < 60KB gzipped
- Feed query p95: < 200ms (covered by `community_posts_feed_idx`)
- Link preview fetch: 5s hard timeout; falls back to "no preview" (post still saves)

### Dependencies to add

- `react-markdown@^9`
- `rehype-sanitize@^6`
- `remark-gfm@^4`
- `cheerio@^1` (server-only)

---

## Section 7 — Out of Scope (explicit)

These are **not** in this MVP and require their own specs:

- Image / video / file upload (no Supabase Storage bucket created)
- @mentions, hashtags, search
- DMs, in-app notifications, email digests
- Per-user feed preferences, mute, follow
- Multi-partner membership (1 partner max per user; future need → scope-picker UI)
- Realtime updates (Supabase Realtime) — feed refreshes on action only
- Members directory + profiles
- Leaderboards / gamification
- Multi-space / sub-communities within a single partner scope
- DNS rebinding guard on link previews
- Bulk moderation actions

---

## Appendix A — Touched files

### New
- `supabase/migrations/042_community_feed.sql`
- `lib/community/*` (8 files)
- `app/api/community/**` (~15 route files)
- `app/[locale]/learn/dashboard/community/[postId]/page.tsx`
- `app/[locale]/admin/community/page.tsx`
- `app/[locale]/partner/[slug]/community/page.tsx`
- `components/community/*` (15 components)
- `components/admin/community/ModerationDashboard.tsx`
- `supabase/tests/community_rls.test.ts`

### Modified
- `app/[locale]/learn/dashboard/community/page.tsx` — replaces stub with new feed
- `messages/en.json`, `messages/ja.json` — add `community.*` namespace (Appendix B)
- `lib/analytics.ts` — add new event helpers
- `package.json` — add 4 deps

### Preserved (consumed by `CourseChannelsStrip`)
- `app/api/dashboard/community/route.ts`
- `lib/dashboard/types.ts` (`CommunityLink`)
- `lib/dashboard/queries.ts`

### Follow-up (separate migration)
- `supabase/migrations/043_drop_is_vertice_member.sql` — drop boolean one release after this ships

---

## Appendix B — i18n keys to add

Under `community.*` in both `messages/en.json` and `messages/ja.json`. JP marked `// TBD-JP` for human review.

```jsonc
{
  "community": {
    "page_title": "Community",                                    // JP: TBD-JP
    "feed_empty": "Be the first to post.",                        // JP: TBD-JP
    "composer_placeholder": "Share something with the community...", // JP: TBD-JP
    "composer_hint": "Markdown supported. Be kind.",              // JP: TBD-JP
    "composer_submit": "Post",                                    // JP: TBD-JP
    "category_general": "General",                                // JP: TBD-JP
    "category_show_and_tell": "Show & Tell",                      // JP: TBD-JP
    "category_help": "Help",                                      // JP: TBD-JP
    "category_wins": "Wins",                                      // JP: TBD-JP
    "category_announcements": "Announcements",                    // JP: TBD-JP
    "post_edited_label": "edited",                                // JP: TBD-JP
    "post_pinned_label": "Pinned",                                // JP: TBD-JP
    "post_deleted_body": "[deleted by author]",                   // JP: TBD-JP
    "post_removed_body": "[removed by moderator]",                // JP: TBD-JP
    "post_hidden_banner": "This post is hidden by moderators.",   // JP: TBD-JP
    "comment_reply": "Reply",                                     // JP: TBD-JP
    "comment_placeholder": "Add a comment...",                    // JP: TBD-JP
    "like": "Like",                                               // JP: TBD-JP
    "menu_report": "Report",                                      // JP: TBD-JP
    "menu_edit": "Edit",                                          // JP: TBD-JP
    "menu_delete": "Delete",                                      // JP: TBD-JP
    "menu_pin": "Pin",                                            // JP: TBD-JP
    "menu_unpin": "Unpin",                                        // JP: TBD-JP
    "menu_hide": "Hide",                                          // JP: TBD-JP
    "menu_unhide": "Unhide",                                      // JP: TBD-JP
    "menu_ban_author": "Ban author",                              // JP: TBD-JP
    "report_dialog_title": "Report this post",                    // JP: TBD-JP
    "report_reason_spam": "Spam",                                 // JP: TBD-JP
    "report_reason_harassment": "Harassment",                     // JP: TBD-JP
    "report_reason_off_topic": "Off-topic",                       // JP: TBD-JP
    "report_reason_other": "Other",                               // JP: TBD-JP
    "report_note_placeholder": "Optional details (200 char max)", // JP: TBD-JP
    "report_submit": "Submit report",                             // JP: TBD-JP
    "report_thanks_toast": "Thanks — moderators will review.",    // JP: TBD-JP
    "paywall_title": "Join the HonuVibe Community",               // JP: TBD-JP
    "paywall_subtitle": "Connect with fellow builders.",          // JP: TBD-JP
    "paywall_cta_community": "Subscribe — Community",             // JP: TBD-JP
    "paywall_cta_vault": "Subscribe — Vault",                     // JP: TBD-JP
    "paywall_cta_courses": "Browse courses",                      // JP: TBD-JP
    "banned_banner": "You are banned from this community.",       // JP: TBD-JP
    "line_join_title": "LINE グループに参加",                     // (JP-native)
    "line_join_subtitle": "コミュニティのLINEグループに参加して交流しましょう。",
    "line_join_cta": "LINEで参加",
    "course_channels_strip_label": "Your course channels"         // JP: TBD-JP
  }
}
```

---

## Verification (end-to-end, after step 4 deploys)

1. **Free user**: visits `/learn/dashboard/community` → sees paywall with three CTAs.
2. **Course-only user**: sees HonuVibe-main feed, can post, can see other main posts.
3. **Vertice member**: sees Vertice-branded feed, cannot see HonuVibe-main posts (verify via DB direct check), cannot post into main scope.
4. **Vertice member + HonuVibe course enrollee**: scope returns Vertice (membership wins), only sees Vertice feed.
5. **HonuVibe admin**: visits `/admin/community` → sees reports from all scopes, can pin/hide/delete in any.
6. **Partner admin for Vertice**: visits `/partner/vertice-society/community` → sees Vertice reports only, cannot moderate main.
7. **Banned user**: cannot post in banned scope (API returns 403 via RLS); can still post in other scopes they qualify for.
8. **JP user**: sees `<LineJoinCard />` above feed; clicking emits `line_join_card_clicked` analytics.
9. **Post with URL**: composer auto-fetches preview within ~1s, renders card; preview survives post save.
10. **Run the 9 RLS leak tests** in `supabase/tests/community_rls.test.ts` — all pass.
