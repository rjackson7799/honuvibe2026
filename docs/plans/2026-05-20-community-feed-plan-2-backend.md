# Community Feed — Plan 2: Backend (lib + API)

**Goal:** Ship the server-side surface for the community feed — `lib/community/*` utilities and all `app/api/community/**` route handlers. After this plan, every backend behavior in the spec is callable via HTTP with curl/Postman; no UI yet.

**Architecture:** App Router route handlers calling typed helpers in `lib/community/*`. Two Supabase clients: the per-request `createClient()` for RLS-respecting user calls, `createAdminClient()` for service-role operations (link-preview cache, trigger-bypass paths, audit log inserts where needed). Markdown rendered server-side. Link previews fetched server-side with SSRF guard. Rate limiting in-memory per Vercel function instance.

**Spec:** [docs/plans/2026-05-20-community-feed-mvp-design.md](./2026-05-20-community-feed-mvp-design.md) Sections 2, 3, 4, 5.

**Verification:** Every endpoint testable via curl with a real session cookie. No browser/UI work in this plan.

---

## Logical commits

This plan ships as **6 commits** to main, each independently verifiable:

| # | Commit | What |
|---|---|---|
| 1 | `feat(community): foundation lib + types` | `types.ts`, `scope.ts`, `rate-limit.ts`, `markdown.ts`, new deps |
| 2 | `feat(community): read queries + GET feed/post API` | `queries.ts`, `GET /feed`, `GET /posts/[id]` |
| 3 | `feat(community): write mutations + post/comment/like API` | `mutations.ts`, `POST /posts`, `PATCH/DELETE /posts/[id]`, `POST /posts/[id]/comments`, `PATCH/DELETE /comments/[id]`, `POST/DELETE /posts/[id]/like` |
| 4 | `feat(community): link preview fetcher + API` | `link-preview.ts`, `POST /link-preview` |
| 5 | `feat(community): moderation API` | `moderation.ts`, `POST /posts/[id]/pin`, `/hide`, `POST /reports`, `PATCH /reports/[id]`, `POST /bans`, `DELETE /bans/[user_id]` |
| 6 | `chore(community): wire analytics events` | extend [lib/analytics.ts](../../lib/analytics.ts) with 7 new event helpers |

---

## File structure

```
lib/community/
├── types.ts          # Post, Comment, Scope, LinkPreview, Report, Ban, ModAction, Category enum
├── scope.ts          # getCommunityScope, requireCommunityScope; mirrors lib/vault/access.ts
├── queries.ts        # listFeed, getPost, listComments, listReports, listBans
├── mutations.ts      # createPost, updatePost, deletePost, addComment, deleteComment, toggleLike, pinPost, unpinPost, hidePost, unhidePost, deletePostAsMod, hideComment, deleteCommentAsMod, fileReport, resolveReport, banUser, unbanUser, logModAction
├── markdown.ts       # renderMarkdown(body): React tree via react-markdown + rehype-sanitize + remark-gfm
├── link-preview.ts   # fetchLinkPreview(url): SSRF guard, 2MB cap, 5s timeout, 7d cache via Supabase
├── moderation.ts     # canModerate(scope), spamFlag(body)
├── rate-limit.ts     # tryConsume(key, limit, windowMs); in-memory token bucket
└── constants.ts      # CATEGORIES, EDIT_WINDOW_MS, MAX_BODY_LEN, MAX_COMMENT_LEN, RATE_LIMITS

app/api/community/
├── feed/route.ts                          # GET ?cursor=&category=
├── posts/route.ts                         # POST (create)
├── posts/[id]/route.ts                    # GET, PATCH, DELETE
├── posts/[id]/pin/route.ts                # POST (mod)
├── posts/[id]/hide/route.ts               # POST (mod)
├── posts/[id]/like/route.ts               # POST, DELETE
├── posts/[id]/comments/route.ts           # POST (add)
├── comments/[id]/route.ts                 # PATCH, DELETE
├── reports/route.ts                       # POST
├── reports/[id]/route.ts                  # PATCH (resolve)
├── bans/route.ts                          # POST
├── bans/[user_id]/route.ts                # DELETE
└── link-preview/route.ts                  # POST
```

Total: **9 lib files**, **13 route files**.

---

## Commit 1 — Foundation: types, scope, rate-limit, markdown

### Steps

- [ ] Install deps: `pnpm add react-markdown@^9 rehype-sanitize@^6 remark-gfm@^4 cheerio@^1`
- [ ] Create `lib/community/constants.ts`:

```ts
export const CATEGORIES = ['general', 'show_and_tell', 'help', 'wins', 'announcements'] as const;
export type Category = typeof CATEGORIES[number];

export const MAX_POST_BODY_LEN = 10_000;
export const MAX_COMMENT_LEN = 4_000;
export const EDIT_WINDOW_MS = 15 * 60 * 1000;

export const RATE_LIMITS = {
  reports: { limit: 5, windowMs: 60 * 60 * 1000 },        // 5 reports/hr/user
  linkPreview: { limit: 30, windowMs: 60 * 60 * 1000 },   // 30 previews/hr/user
} as const;
```

- [ ] Create `lib/community/types.ts`:

```ts
import type { Category } from './constants';

export interface CommunityScope {
  partnerId: string | null;
  partner: { id: string; slug: string; name_en: string; primary_color: string | null; line_url: string | null } | null;
}

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  site: string | null;
}

export interface Post {
  id: string;
  partner_id: string | null;
  author_id: string;
  category: Category;
  body_md: string;
  link_preview: LinkPreview | null;
  status: 'published' | 'hidden' | 'deleted';
  pinned_at: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  // joined
  author?: { id: string; full_name: string | null; avatar_url: string | null };
  liked_by_me?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  partner_id: string | null;
  author_id: string;
  body_md: string;
  parent_comment_id: string | null;
  status: 'published' | 'hidden' | 'deleted';
  created_at: string;
  author?: { id: string; full_name: string | null; avatar_url: string | null };
}

export interface Report {
  id: string;
  partner_id: string | null;
  target_type: 'post' | 'comment';
  target_id: string;
  reporter_id: string;
  reason: 'spam' | 'harassment' | 'off_topic' | 'other' | 'auto_flag';
  note: string | null;
  status: 'open' | 'resolved';
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface Ban {
  partner_id: string | null;
  user_id: string;
  banned_by: string;
  reason: string | null;
  created_at: string;
}
```

- [ ] Create `lib/community/scope.ts`:

```ts
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CommunityScope } from './types';

/**
 * Returns the user's community scope, or null if they have no access at all.
 * Mirrors the Postgres community_scope_for() + has_community_access() functions.
 */
export async function getCommunityScope(supabase: SupabaseClient): Promise<CommunityScope | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Check access first (cheap, single query via RPC)
  const { data: access } = await supabase.rpc('has_community_access', { p_user_id: user.id });
  if (!access) return null;

  // Resolve scope
  const { data: scopeId } = await supabase.rpc('community_scope_for', { p_user_id: user.id });
  if (!scopeId) return { partnerId: null, partner: null };

  // Load partner brand
  const { data: partner } = await supabase
    .from('partners')
    .select('id, slug, name_en, primary_color, line_url')
    .eq('id', scopeId)
    .single();

  return { partnerId: scopeId as string, partner: partner ?? null };
}

export async function requireCommunityScope(supabase: SupabaseClient): Promise<CommunityScope> {
  const scope = await getCommunityScope(supabase);
  if (!scope) redirect('/learn/dashboard/community');
  return scope;
}
```

- [ ] Create `lib/community/rate-limit.ts`:

```ts
// Simple in-memory token bucket. Per Vercel function instance — fine for MVP.
// Swap to Vercel KV / Redis when we have multi-region scale.

type Bucket = { tokens: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function tryConsume(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { tokens: limit - 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.tokens <= 0) return false;
  existing.tokens -= 1;
  return true;
}
```

- [ ] Create `lib/community/markdown.ts`:

```ts
import ReactMarkdown from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a || []),
      ['rel', 'noopener', 'nofollow', 'ugc'],
      ['target', '_blank'],
    ],
  },
  tagNames: (defaultSchema.tagNames || []).filter(
    (t) => !['script', 'iframe', 'style', 'object', 'embed'].includes(t),
  ),
};

export function CommunityMarkdown({ body }: { body: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeSanitize, schema]]}
      components={{
        a: ({ node: _node, ...props }) => (
          <a {...props} rel="noopener nofollow ugc" target="_blank" />
        ),
      }}
    >
      {body}
    </ReactMarkdown>
  );
}
```

(File extension must be `.tsx` since it returns JSX.)

- [ ] Verify type-checks: `pnpm type-check`
- [ ] Commit.

---

## Commit 2 — Read queries + feed/post GET API

### Steps

- [ ] Create `lib/community/queries.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Comment, Post } from './types';
import type { Category } from './constants';

const POST_SELECT = `
  id, partner_id, author_id, category, body_md, link_preview,
  status, pinned_at, like_count, comment_count, created_at, updated_at,
  author:users!community_posts_author_id_fkey ( id, full_name, avatar_url )
`;

export interface FeedPage {
  posts: Post[];
  nextCursor: string | null;
}

export async function listFeed(
  supabase: SupabaseClient,
  opts: { partnerId: string | null; category?: Category; cursor?: string; limit?: number },
): Promise<FeedPage> {
  const limit = opts.limit ?? 20;
  let q = supabase
    .from('community_posts')
    .select(POST_SELECT)
    .eq('status', 'published')
    .order('pinned_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (opts.partnerId === null) q = q.is('partner_id', null);
  else q = q.eq('partner_id', opts.partnerId);

  if (opts.category) q = q.eq('category', opts.category);
  if (opts.cursor) q = q.lt('created_at', opts.cursor);

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as unknown as Post[];
  const hasMore = rows.length > limit;
  const posts = rows.slice(0, limit);
  const nextCursor = hasMore ? posts[posts.length - 1].created_at : null;
  return { posts, nextCursor };
}

export async function getPost(supabase: SupabaseClient, id: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('community_posts')
    .select(POST_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Post) ?? null;
}

export async function listComments(supabase: SupabaseClient, postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('community_comments')
    .select(`
      id, post_id, partner_id, author_id, body_md, parent_comment_id, status, created_at,
      author:users!community_comments_author_id_fkey ( id, full_name, avatar_url )
    `)
    .eq('post_id', postId)
    .eq('status', 'published')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Comment[];
}
```

- [ ] Create `app/api/community/feed/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCommunityScope } from '@/lib/community/scope';
import { listFeed } from '@/lib/community/queries';
import { CATEGORIES, type Category } from '@/lib/community/constants';

export async function GET(req: Request) {
  const supabase = await createClient();
  const scope = await getCommunityScope(supabase);
  if (!scope) return NextResponse.json({ error: 'paywall' }, { status: 402 });

  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor') ?? undefined;
  const categoryParam = url.searchParams.get('category');
  const category =
    categoryParam && (CATEGORIES as readonly string[]).includes(categoryParam)
      ? (categoryParam as Category)
      : undefined;

  const page = await listFeed(supabase, { partnerId: scope.partnerId, category, cursor });
  return NextResponse.json(page);
}
```

- [ ] Create `app/api/community/posts/[id]/route.ts` (GET handler only for this commit — PATCH/DELETE in Commit 3):

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCommunityScope } from '@/lib/community/scope';
import { getPost, listComments } from '@/lib/community/queries';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const scope = await getCommunityScope(supabase);
  if (!scope) return NextResponse.json({ error: 'paywall' }, { status: 402 });

  const post = await getPost(supabase, id);
  if (!post) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const comments = await listComments(supabase, id);
  return NextResponse.json({ post, comments });
}
```

- [ ] Type-check, commit.

---

## Commit 3 — Write mutations + post/comment/like API

### Steps

- [ ] Create `lib/community/mutations.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Category } from './constants';
import type { LinkPreview, Post, Comment } from './types';
import { EDIT_WINDOW_MS, MAX_POST_BODY_LEN, MAX_COMMENT_LEN } from './constants';

export class CommunityError extends Error {
  constructor(public code: 'unauthorized' | 'forbidden' | 'not_found' | 'invalid' | 'rate_limited' | 'edit_window_expired', message: string) {
    super(message);
  }
}

export async function createPost(
  supabase: SupabaseClient,
  input: { category: Category; body_md: string; link_preview: LinkPreview | null; partner_id: string | null; author_id: string },
): Promise<Post> {
  if (input.body_md.trim().length === 0) throw new CommunityError('invalid', 'empty body');
  if (input.body_md.length > MAX_POST_BODY_LEN) throw new CommunityError('invalid', 'body too long');
  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      partner_id: input.partner_id,
      author_id: input.author_id,
      category: input.category,
      body_md: input.body_md,
      link_preview: input.link_preview,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Post;
}

export async function updatePostBody(
  supabase: SupabaseClient,
  postId: string,
  authorId: string,
  body_md: string,
): Promise<Post> {
  if (body_md.length > MAX_POST_BODY_LEN) throw new CommunityError('invalid', 'body too long');
  const { data: existing } = await supabase
    .from('community_posts')
    .select('created_at, author_id')
    .eq('id', postId)
    .maybeSingle();
  if (!existing) throw new CommunityError('not_found', 'post not found');
  if (existing.author_id !== authorId) throw new CommunityError('forbidden', 'not your post');
  if (Date.now() - new Date(existing.created_at).getTime() > EDIT_WINDOW_MS) {
    throw new CommunityError('edit_window_expired', 'edit window expired');
  }
  const { data, error } = await supabase
    .from('community_posts')
    .update({ body_md, updated_at: new Date().toISOString() })
    .eq('id', postId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Post;
}

export async function deletePostAsAuthor(supabase: SupabaseClient, postId: string): Promise<void> {
  const { error } = await supabase
    .from('community_posts')
    .update({ status: 'deleted' })
    .eq('id', postId);
  if (error) throw error;
}

export async function addComment(
  supabase: SupabaseClient,
  input: { post_id: string; body_md: string; parent_comment_id: string | null; author_id: string },
): Promise<Comment> {
  if (input.body_md.trim().length === 0) throw new CommunityError('invalid', 'empty body');
  if (input.body_md.length > MAX_COMMENT_LEN) throw new CommunityError('invalid', 'too long');

  // Enforce single-level nesting: if parent has a parent, reparent to root.
  let parentId = input.parent_comment_id;
  if (parentId) {
    const { data: parent } = await supabase
      .from('community_comments')
      .select('parent_comment_id')
      .eq('id', parentId)
      .maybeSingle();
    if (parent?.parent_comment_id) parentId = parent.parent_comment_id;
  }

  const { data, error } = await supabase
    .from('community_comments')
    .insert({
      post_id: input.post_id,
      author_id: input.author_id,
      body_md: input.body_md,
      parent_comment_id: parentId,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Comment;
}

export async function deleteCommentAsAuthor(supabase: SupabaseClient, commentId: string): Promise<void> {
  const { error } = await supabase
    .from('community_comments')
    .update({ status: 'deleted' })
    .eq('id', commentId);
  if (error) throw error;
}

export async function toggleLike(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
  liked: boolean,
): Promise<void> {
  if (liked) {
    const { error } = await supabase
      .from('community_post_likes')
      .upsert({ post_id: postId, user_id: userId }, { onConflict: 'post_id,user_id' });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('community_post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
    if (error) throw error;
  }
}
```

- [ ] Create `app/api/community/posts/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCommunityScope } from '@/lib/community/scope';
import { createPost, CommunityError } from '@/lib/community/mutations';
import { CATEGORIES, type Category } from '@/lib/community/constants';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const scope = await getCommunityScope(supabase);
  if (!scope) return NextResponse.json({ error: 'paywall' }, { status: 402 });

  const body = await req.json().catch(() => null) as
    | { category: string; body_md: string; link_preview?: unknown }
    | null;
  if (!body || !(CATEGORIES as readonly string[]).includes(body.category) || typeof body.body_md !== 'string') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  try {
    const post = await createPost(supabase, {
      category: body.category as Category,
      body_md: body.body_md,
      link_preview: (body.link_preview as never) ?? null,
      partner_id: scope.partnerId,
      author_id: user.id,
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    if (err instanceof CommunityError) return NextResponse.json({ error: err.code }, { status: 400 });
    throw err;
  }
}
```

- [ ] Extend `app/api/community/posts/[id]/route.ts` with `PATCH` (author edit, 15-min window) and `DELETE` (author soft-delete). Use `updatePostBody` and `deletePostAsAuthor` from mutations. Return 403 on `edit_window_expired`.

- [ ] Create `app/api/community/posts/[id]/comments/route.ts` — `POST` handler calling `addComment`.

- [ ] Create `app/api/community/comments/[id]/route.ts` — `PATCH` (author edit) and `DELETE` (author soft-delete). Same 15-min window enforcement.

- [ ] Create `app/api/community/posts/[id]/like/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCommunityScope } from '@/lib/community/scope';
import { toggleLike } from '@/lib/community/mutations';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const scope = await getCommunityScope(supabase);
  if (!scope) return NextResponse.json({ error: 'paywall' }, { status: 402 });

  await toggleLike(supabase, id, user.id, true);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  await toggleLike(supabase, id, user.id, false);
  return NextResponse.json({ ok: true });
}
```

- [ ] Type-check, commit.

---

## Commit 4 — Link preview fetcher + API

### Steps

- [ ] Create `lib/community/link-preview.ts`:

```ts
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import * as net from 'node:net';
import * as cheerio from 'cheerio';
import { createAdminClient } from '@/lib/supabase/server';
import type { LinkPreview } from './types';

const TIMEOUT_MS = 5000;
const MAX_BYTES = 2 * 1024 * 1024;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;       // link-local
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique-local
    if (lower.startsWith('fe80')) return true;                          // link-local
    if (lower.startsWith('::ffff:')) {
      const v4 = lower.slice(7);
      return isPrivateIp(v4);
    }
    return false;
  }
  return true; // unknown format: deny
}

async function assertPublicHostname(hostname: string): Promise<void> {
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('private_ip');
    return;
  }
  const records = await dns.lookup(hostname, { all: true });
  for (const r of records) {
    if (isPrivateIp(r.address)) throw new Error('private_ip');
  }
}

async function fetchWithCaps(url: string): Promise<{ html: string; finalUrl: string } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    const u = new URL(current);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    await assertPublicHostname(u.hostname);

    const res = await fetch(current, {
      redirect: 'manual',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'HonuVibeBot/1.0 (+https://honuvibe.ai)' },
    });

    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get('location');
      if (!next) return null;
      current = new URL(next, current).toString();
      continue;
    }

    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('text/html')) {
      clearTimeout(t);
      return null;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      clearTimeout(t);
      return null;
    }
    let received = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) {
        try { await reader.cancel(); } catch {}
        clearTimeout(t);
        return null;
      }
      chunks.push(value);
    }
    clearTimeout(t);
    const html = new TextDecoder().decode(Buffer.concat(chunks));
    return { html, finalUrl: current };
  }
  clearTimeout(t);
  return null;
}

function parseOg(html: string, finalUrl: string): LinkPreview {
  const $ = cheerio.load(html);
  const meta = (selector: string) => $(`meta[${selector}]`).attr('content')?.trim() || null;
  const title = meta('property="og:title"') || $('title').first().text().trim() || null;
  const description = meta('property="og:description"') || meta('name="description"') || null;
  let image = meta('property="og:image"');
  if (image) {
    try {
      const abs = new URL(image, finalUrl);
      image = abs.protocol === 'https:' ? abs.toString() : null;
    } catch {
      image = null;
    }
  }
  const site = meta('property="og:site_name"') || new URL(finalUrl).hostname;
  return { url: finalUrl, title, description, image: image ?? null, site };
}

export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview | null> {
  let url: URL;
  try { url = new URL(rawUrl); } catch { return null; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const hash = crypto.createHash('sha256').update(url.toString()).digest('hex');
  const admin = createAdminClient();

  const { data: cached } = await admin
    .from('link_previews')
    .select('preview, fetched_at')
    .eq('url_hash', hash)
    .maybeSingle();

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at as string).getTime();
    if (age < CACHE_TTL_MS) {
      const p = cached.preview as Record<string, unknown>;
      if ('error' in p) return null;
      return p as unknown as LinkPreview;
    }
  }

  try {
    const fetched = await fetchWithCaps(url.toString());
    if (!fetched) {
      await admin.from('link_previews').upsert({ url_hash: hash, url: url.toString(), preview: { error: 'fetch_failed' } });
      return null;
    }
    const preview = parseOg(fetched.html, fetched.finalUrl);
    await admin
      .from('link_previews')
      .upsert({ url_hash: hash, url: url.toString(), preview: preview as never, fetched_at: new Date().toISOString() });
    return preview;
  } catch {
    await admin.from('link_previews').upsert({ url_hash: hash, url: url.toString(), preview: { error: 'exception' } });
    return null;
  }
}
```

- [ ] Create `app/api/community/link-preview/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCommunityScope } from '@/lib/community/scope';
import { fetchLinkPreview } from '@/lib/community/link-preview';
import { tryConsume } from '@/lib/community/rate-limit';
import { RATE_LIMITS } from '@/lib/community/constants';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const scope = await getCommunityScope(supabase);
  if (!scope) return NextResponse.json({ error: 'paywall' }, { status: 402 });

  if (!tryConsume(`lp:${user.id}`, RATE_LIMITS.linkPreview.limit, RATE_LIMITS.linkPreview.windowMs)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const body = await req.json().catch(() => null) as { url?: unknown } | null;
  if (!body || typeof body.url !== 'string') return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const preview = await fetchLinkPreview(body.url);
  return NextResponse.json({ preview });
}
```

- [ ] Type-check. Smoke test with curl against a known-good URL and a private URL (`http://localhost:8000`) — second should return `{preview: null}`.
- [ ] Commit.

---

## Commit 5 — Moderation API

### Steps

- [ ] Create `lib/community/moderation.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export async function canModeratePartner(
  supabase: SupabaseClient,
  partnerId: string | null,
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: adm } = await supabase.rpc('is_admin');
  if (adm) return true;
  if (partnerId === null) return false;
  const { data: pa } = await supabase.rpc('is_partner_for', { p_partner_id: partnerId });
  return !!pa;
}

const URL_RE = /https?:\/\/\S+/g;
const SPAM_KEYWORDS = [/* configurable; start empty */] as RegExp[];

export function shouldAutoFlag(body: string): boolean {
  const urls = body.match(URL_RE) ?? [];
  if (urls.length >= 5) return true;
  return SPAM_KEYWORDS.some((re) => re.test(body));
}
```

- [ ] Add to `lib/community/mutations.ts`:
  - `pinPost(supabase, postId, partnerId)` — transaction wrapper: `UPDATE` unpin existing, `UPDATE` pin new (use a Postgres function or two sequential calls — the second is fine; brief race window but acceptable for MVP)
  - `unpinPost(supabase, postId)`
  - `hidePost(supabase, postId)`, `unhidePost(supabase, postId)`
  - `deletePostAsMod(supabase, postId)`
  - `hideComment(supabase, commentId)`, `deleteCommentAsMod(supabase, commentId)`
  - `fileReport(supabase, input)`
  - `resolveReport(supabase, reportId, resolverId)`
  - `banUser(supabase, input)` and `unbanUser(supabase, partnerId, userId)`
  - `logModAction(supabase, input)` — writes to `community_mod_actions`

  Each mod mutation also calls `logModAction` with the appropriate `action` enum.

- [ ] Create route files (each follows the same auth + canModeratePartner pattern):
  - `app/api/community/posts/[id]/pin/route.ts` — `POST` pin
  - `app/api/community/posts/[id]/hide/route.ts` — `POST` hide
  - `app/api/community/reports/route.ts` — `POST` (member files report; rate-limited via `RATE_LIMITS.reports`; also auto-fires `shouldAutoFlag` check inside `createPost` in Commit 3 — verify it's already wired or add here)
  - `app/api/community/reports/[id]/route.ts` — `PATCH` resolve
  - `app/api/community/bans/route.ts` — `POST` ban
  - `app/api/community/bans/[user_id]/route.ts` — `DELETE` unban (read `partner_id` from query)

  Each route:
  1. Auth check (401)
  2. Load target row (404 if missing) to determine `partner_id`
  3. `canModeratePartner(supabase, partner_id)` check (403)
  4. Call mutation
  5. Return JSON

- [ ] Update `createPost` in mutations.ts to call `shouldAutoFlag(body_md)` and insert a `community_reports` row with `reason='auto_flag'` if true (use admin client so the report write happens server-side regardless of RLS).

- [ ] Type-check, commit.

---

## Commit 6 — Analytics events

### Steps

- [ ] Open [lib/analytics.ts](../../lib/analytics.ts), add 7 new event helpers matching spec Section 6:

```ts
export const trackCommunityPostCreated = (props: { partner_scope: string; category: string; body_length: number; has_link_preview: boolean }) =>
  trackEvent('community_post_created', props);
// ...etc for community_comment_created, community_post_liked, community_post_reported,
// community_paywall_viewed, community_paywall_cta_clicked, line_join_card_clicked
```

- [ ] Wire calls from the API routes that emit them (post creation, comment creation, like, report). Paywall + LINE-card events fire from the UI (Plan 3/4).

- [ ] Type-check, commit, push.

---

## Verification (curl smoke tests after all 6 commits)

Run from a terminal authenticated as a HonuVibe-paid user (paste a real session cookie):

```bash
# 1. Feed (empty)
curl -s -H "Cookie: $COOKIE" http://localhost:3000/api/community/feed | jq

# 2. Create post
curl -s -X POST -H "Cookie: $COOKIE" -H 'Content-Type: application/json' \
  -d '{"category":"general","body_md":"hello world"}' \
  http://localhost:3000/api/community/posts | jq

# 3. Feed (one post)
curl -s -H "Cookie: $COOKIE" http://localhost:3000/api/community/feed | jq

# 4. Like it
POST_ID=<id from step 2>
curl -s -X POST -H "Cookie: $COOKIE" http://localhost:3000/api/community/posts/$POST_ID/like | jq

# 5. Comment
curl -s -X POST -H "Cookie: $COOKIE" -H 'Content-Type: application/json' \
  -d '{"body_md":"first comment","parent_comment_id":null}' \
  http://localhost:3000/api/community/posts/$POST_ID/comments | jq

# 6. Get post + comments
curl -s -H "Cookie: $COOKIE" http://localhost:3000/api/community/posts/$POST_ID | jq

# 7. Link preview
curl -s -X POST -H "Cookie: $COOKIE" -H 'Content-Type: application/json' \
  -d '{"url":"https://github.com"}' \
  http://localhost:3000/api/community/link-preview | jq
# Expected: {preview: {title:"...", site:"github.com", ...}}

# 8. SSRF guard
curl -s -X POST -H "Cookie: $COOKIE" -H 'Content-Type: application/json' \
  -d '{"url":"http://169.254.169.254/latest/meta-data/"}' \
  http://localhost:3000/api/community/link-preview | jq
# Expected: {preview: null}

# 9. Vertice member sees nothing of the above (run with Vertice session cookie)
curl -s -H "Cookie: $VERTICE_COOKIE" http://localhost:3000/api/community/feed | jq
# Expected: {posts: [], nextCursor: null}
```

---

## Out of scope (Plans 3 + 4)

- All UI: feed page, post detail, composer, comments, likes, paywall, JP LINE card, course-channels strip
- Admin moderation page UI (`/admin/community`, `/partner/[slug]/community`)
- i18n strings (rendered in Plan 3/4 — backend stays bilingual-content-agnostic)
