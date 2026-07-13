# Community — Finish the Half-Built Features

> Self-contained: this doc is everything the execution session needs.
> **No migration, no new dependencies.** The Community Feed feature
> (`supabase/migrations/042_community_feed.sql`) is already a mature MVP — this
> plan wires UI onto backends that already exist, and closes the correctness
> edges that wiring exposes. Revised after an adversarial plan review (see
> "Review resolutions" at the end).

## Context

The member Community feed at `/learn/dashboard/community` looks thin in the
browser (one test post, no avatar set), but the feature underneath is a
production-grade forum: posts in 5 categories, sanitized GFM markdown, working
likes and comments, link previews, a full moderation suite, reply
notifications, paywall/partner scoping, and EN/JA i18n parity.

Four capabilities were built on the backend but never wired to the UI. In every
case the mutation, the API route, the RLS policy, and (often) the exact props /
i18n keys already exist — they're just not rendered. This plan connects those
four wires **and** resolves the correctness edges the review surfaced (banned
users, comment-delete counts/orphans, hydration, accessibility, error UX).

The four gaps (all confirmed in code):
1. **Feed like-state** — `Post.liked_by_me` exists on the type but `listFeed`
   never hydrates it, so feed cards can't show whether you liked a post.
2. **Reply-to-comment** — `CommentComposer` already accepts `parentCommentId` /
   `onSubmitted` and `addComment` already enforces single-level nesting, but no
   component passes those props or renders a Reply button.
3. **Comment menu (edit + delete + report)** — `updateCommentBody`, the
   `PATCH`/`DELETE` routes, and `ReportDialog`'s `targetType="comment"` path all
   exist; comments have no `…` menu to invoke them.
4. **Edit post (UI)** — `updatePostBody`, the `PATCH /api/community/posts/[id]`
   route, the 15-min `EDIT_WINDOW_MS` check, and `PostMenu`'s `withinEditWindow`
   prop all exist; `PostMenu` ignores the prop and renders no Edit item.

Intended outcome: members can like from the feed, reply to comments, and edit
or delete their own posts/comments (and report others'), using the machinery
that already ships — with correct counts, no orphaned replies, no hydration
mismatches, accessible controls, localized errors, and zero schema change.

## Decisions locked with Ryan

1. **Scope = finish the four half-built features + their correctness edges.** No
   real-time, no emoji reactions, no richer notifications, no search.
2. **Feed heart is interactive**, via the stretched-link pattern.
3. **Post edit uses a URL param (`?edit=1`); comment reply/edit use inline client
   state.** Each is the natural fit for its surface; comment inline-toggle is the
   pattern `CommentComposer`'s `onSubmitted` was designed for.
4. **The feed card is a navigation surface.** Only the Like control is
   interactive on a card; markdown links and the link-preview are interactive on
   the **detail** page, not the card. (This also fixes the current invalid
   `<a>`-inside-`<a>` nesting.)
5. **Author comment-delete is a physical delete via the service-role client**,
   gated by an app-side authorship check — see §3 and "Review resolutions #2".
   This keeps `comment_count` correct and removes orphaned replies **with no
   migration**, because it reuses the existing `ON DELETE CASCADE` on
   `parent_comment_id` and the `AFTER INSERT OR DELETE` count trigger.
6. **No live edit-window timer.** The 15-min Edit affordance is computed at
   render; it disappears on the next refresh/navigation, and any stale attempt
   gets the server's 403 and a localized error. (YAGNI for a 15-min window.)
7. **Deleting a comment cascade-deletes its replies (including replies by other
   members).** Confirmed with Ryan (2026-07-12). This reuses the database's
   existing `parent_comment_id ON DELETE CASCADE` and is what keeps counts
   correct without a migration. No guard against deleting a comment that has
   replies — the whole thread goes.

## Why the two edit mechanisms differ

- **Post edit → `?edit=1` URL param.** One post per page, and "close" is just
  navigating back — no client callback needed. Server-rendering the editor in
  place of the body matches the app's existing URL-param style (`?category`,
  `?cursor`) and avoids lifting client state across `PostMenu` ↔ body.
- **Comment reply + edit → inline client state.** Comments toggle independently
  and `CommentComposer` exposes `onSubmitted` specifically so a client parent can
  close the inline composer on submit.

`CommentItem` becomes a client component to own reply/edit state. Confirmed safe:
`CommunityMarkdown` (`lib/community/markdown.tsx`) is pure `react-markdown`, no
`server-only` dep. **Hydration:** the only non-deterministic value in
`CommentItem` is `timeAgo()` (`Date.now()`), so the relative-time string is
**computed on the server and passed in as a `createdLabel` prop** — the client
component renders no clock.

## Changes

### 1. Feed like-state — interactive heart on cards

- **`lib/community/queries.ts` → `listFeed`**: add `userId?: string | null` to
  `opts`. After `posts` is sliced, if `userId` and `posts.length > 0`:
  ```ts
  const { data: likes, error: likeErr } = await supabase
    .from('community_post_likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', posts.map((p) => p.id));
  if (likeErr) throw likeErr;                 // preserve the throw-on-error convention
  const liked = new Set((likes ?? []).map((l) => l.post_id));
  posts.forEach((p) => { p.liked_by_me = liked.has(p.id); });
  ```
  Behavior unchanged when `userId` is absent.
- **`app/[locale]/learn/dashboard/community/page.tsx`**: pass `userId` into
  `listFeed`, and pass `partnerScope={scope.partner?.slug ?? 'main'}` to each
  `<PostCard>`.
- **`app/api/community/feed/route.ts`** (**required**, not optional): pass the
  route's authed `userId` into `listFeed` too, so both entry points return
  identical `liked_by_me` semantics.
- **`components/community/PostCard.tsx`** (stays a server component):
  - Add `partnerScope: string` prop.
  - **Stretched-link pattern:** outer `<div className="relative …">`; a single
    overlay `<Link href={detail} className="absolute inset-0 z-[1]">` with an
    accessible label — `<span className="sr-only">{Open post by {author}}</span>`
    (localize the "Open post by" fragment). All visual content are siblings under
    the overlay (clicking card body → opens post). Markdown links and the
    link-preview render normally but are intentionally non-interactive on the
    card (decision #4) — valid HTML, no nested anchors.
  - Replace the static like span with the existing `<LikeButton>` wrapped so it
    sits above the overlay and meets the touch target:
    `<span className="relative z-[2]"><LikeButton postId={post.id} initialLiked={post.liked_by_me ?? false} initialCount={post.like_count} partnerScope={partnerScope} /></span>`.
    Comment-count stays static (under the overlay → opens post).

### 2. Reply-to-comment

- **`components/community/CommentItem.tsx`** → client component (`'use client'`).
  Props become: `comment`, `locale`, `isReply`, plus **`createdLabel: string`**
  (server-computed relative time — removes `Date.now()` from the client),
  **`currentUserId: string | null`**, **`partnerScope: string`**, and
  **`canComment: boolean`** (= `!isBanned && !!userId`). Owns `replyOpen` +
  `editing` state.
  - Render the body via `CommunityMarkdown` (or the edit textarea when `editing`,
    see §3). Render `createdLabel` instead of calling `timeAgo`.
  - **Reply** button (existing `t('comment_reply')`) shown only when
    `!isReply && canComment`. Replies are single-level; `addComment` reparents a
    reply-to-a-reply to root anyway.
  - When `replyOpen`, render inline:
    ```tsx
    <CommentComposer postId={comment.post_id} parentCommentId={comment.id}
      partnerScope={partnerScope} onSubmitted={() => setReplyOpen(false)} />
    ```
- **`app/[locale]/learn/dashboard/community/[postId]/page.tsx`**: compute
  `createdLabel` per comment with the page's existing `timeAgo(c.created_at,
  locale)` helper and pass it, plus `currentUserId={userId}`,
  `partnerScope={partnerScope}`, and `canComment={!isBanned && !!userId}` to every
  `<CommentItem>` (the page already computes `isBanned`). Grouping is unchanged.

### 3. Comment menu (edit + delete + report)

- **New `components/community/CommentMenu.tsx`** (client; mirror `PostMenu`'s
  dropdown + click-outside + `ReportDialog` wiring, trimmed to comments). Props:
  `commentId`, `authorId`, `currentUserId`, `partnerScope`, `withinEditWindow`,
  `onEdit: () => void`. Items:
  - **Report** (non-authors) → `ReportDialog` with `targetType="comment"`
    `targetId={commentId}` (already supported; analytics fix in §"Analytics").
  - **Edit** (author && `withinEditWindow`) → `onEdit()`. Uses `t('menu_edit')`.
  - **Delete** (author) → localized `confirm` (see i18n) → `DELETE
    /api/community/comments/[id]` → on **confirmed success** `router.refresh()`;
    on failure show a localized error and do not refresh. Uses `t('menu_delete')`.
- **Edit mode inside `CommentItem`**: when `editing`, swap the body for a
  prefilled `<textarea>` (`maxLength={MAX_COMMENT_LEN}`) with **Save**
  (`t('edit_save')`) and **Cancel** (`t('edit_cancel')`). Save → `PATCH
  /api/community/comments/[id]` `{ body_md }`. **Error UX (required):** on
  non-ok, keep the entered text, exit the busy state, and show a localized
  message — map `edit_window_expired` (403) → `t('error_edit_window')`, other →
  `t('error_generic')`, network → `t('error_network')`. On ok → `router.refresh()`
  + exit edit mode. `withinEditWindow` is computed on the client from
  `comment.created_at` vs `EDIT_WINDOW_MS` to decide whether Edit shows; the
  server re-validates.
- **Harden `deleteCommentAsAuthor` + its route (required).** Root problem: the
  count trigger fires only on physical INSERT/DELETE, and authors have an UPDATE
  but **no DELETE** RLS policy — which is why the old code soft-deleted (leaving
  counts wrong and replies orphaned). Fix, no migration:
  - `app/api/community/comments/[id]/route.ts` `DELETE`: fetch the comment
    (`author_id`) with the user's client; **missing → 404**, **`author_id !==
    user.id` → 403**; otherwise call the mutation below. Return `{ ok: true }`
    only after a confirmed delete.
  - `lib/community/mutations.ts`: replace `deleteCommentAsAuthor`'s body with a
    **physical delete via the service-role client** —
    `createAdminClient().from('community_comments').delete().eq('id', id).select('id')`
    — and treat an empty result as `not_found`. Service role is required only
    because authors lack a DELETE RLS policy; the app-side authorship check above
    is the authorization gate. The existing `parent_comment_id ON DELETE CASCADE`
    removes replies and the `AFTER DELETE` trigger decrements `comment_count` for
    the parent and each cascaded reply → **counts stay correct, no orphans.**
  - Moderator comment deletion stays a **separate** concern (the mod path handles
    posts today); this endpoint remains author-only. Do not widen it.

### 4. Edit post (UI) — URL-param driven

- **`components/community/PostMenu.tsx`**: stop discarding `withinEditWindow`
  (remove the `_withinEditWindow` rename). Add an **Edit** item when
  `isAuthor && withinEditWindow && status === 'published'` that does
  `router.replace('?edit=1')` (**replace**, not push — don't add editor states to
  history; preserve any other existing query params) and closes the menu. Uses
  `t('menu_edit')`.
- **`app/[locale]/learn/dashboard/community/[postId]/page.tsx`**: add
  `searchParams: Promise<{ edit?: string }>`; when `edit === '1'` && `userId ===
  post.author_id` && `withinEditWindow` && `status === 'published'`, render the new
  `PostEditor` in place of the read-only body. Otherwise render the body as today.
- **New `components/community/PostEditor.tsx`** (client): props `postId`,
  `initialBody`. Prefilled `<textarea>` (`maxLength={MAX_POST_BODY_LEN}`), **Save**
  (`t('edit_save')`) → `PATCH /api/community/posts/[postId]` `{ body_md }`; on ok
  → `router.replace(pathnameWithoutEdit)` + `router.refresh()`. **Error UX
  (required):** on non-ok keep text, exit busy, localized message (same mapping as
  §3). **Cancel** (`t('edit_cancel')`) → `router.replace(pathnameWithoutEdit)`.
  Reuses `updatePostBody` (window + authorship re-validated server-side). Category
  and link-preview are not editable — matches `updatePostBody`.

### Analytics (`components/community/ReportDialog.tsx` + `lib/analytics.ts`)

- Generalize the report event so comment reports aren't logged as posts. Add
  `target_type: 'post' | 'comment'` to `trackCommunityPostReported`'s props (and
  emit it in the event payload); pass `targetType` from `ReportDialog`. Event name
  can stay `community_post_reported` with a `target_type` dimension, or split into
  a comment event — either is fine; the requirement is that comment reports carry
  `target_type: 'comment'`.

### Accessibility

- Every **new/newly-surfaced** interactive control gets a ≥44×44px target and a
  `focus-visible` ring: feed `LikeButton`, comment **Reply**, `CommentMenu`
  trigger, **Save**/**Cancel** in both editors. Bump the existing `LikeButton`
  and `PostMenu` trigger hit areas (they use `p-1.5` ≈ 24px) to ≥44px via padding,
  since the feed now leans on them. Overlay link carries the localized
  "Open post by …" label (not just the author name).

### i18n (`messages/en.json` + `messages/ja.json`, `community` namespace — parity)

- **Add:** `edit_save` (Save / 保存), `edit_cancel` (Cancel / キャンセル),
  `error_generic` (Something went wrong. / エラーが発生しました。),
  `error_network` (Network error. / ネットワークエラー。),
  `error_edit_window` (The edit window has passed. / 編集可能な時間を過ぎました。),
  `confirm_delete_comment` (Delete this comment? / このコメントを削除しますか？),
  `open_post_by` (Open post by {name} / {name}さんの投稿を開く).
- **Reuse:** `comment_reply`, `menu_edit`, `menu_delete`, `menu_report`,
  `comment_placeholder`, `composer_submit`.
- **Genericize** `report_dialog_title` (now serves comments too): EN "Report this
  post" → "Report this content"; update JA to match (e.g. この投稿を報告 → この
  コンテンツを報告). Flag JA phrasing as a judgment call in the completion report.
- Optional parallel: localize `PostMenu`'s existing hardcoded English `confirm()`
  strings with a `confirm_delete_post` key for consistency (note if done).

## Files touched

- **Modify:** `lib/community/queries.ts`, `lib/community/mutations.ts`,
  `lib/analytics.ts`, `components/community/PostCard.tsx`,
  `components/community/CommentItem.tsx`, `components/community/PostMenu.tsx`,
  `components/community/ReportDialog.tsx`, `components/community/LikeButton.tsx`
  (touch target), `app/[locale]/learn/dashboard/community/page.tsx`,
  `app/[locale]/learn/dashboard/community/[postId]/page.tsx`,
  `app/api/community/comments/[id]/route.ts`, `app/api/community/feed/route.ts`,
  `messages/en.json`, `messages/ja.json`.
- **Add:** `components/community/PostEditor.tsx`, `components/community/CommentMenu.tsx`.
- **Tests (add, app project):** see Verification.
- **No migration. No new dependencies.**

## Verification

Automated (runs under `pnpm verify` → `vitest run --project app`; harness already
present: `@testing-library/react` + `jsdom`):

- [x] `listFeed` hydrates `liked_by_me` for a user's liked posts; leaves it
      `undefined`/`false` when `userId` is absent; **throws** when the likes
      lookup errors (mock the client).
- [x] EN/JA `community` namespace key parity (fails if a new key is added to one
      file only).
- [x] `CommentItem`: Reply button is hidden when `canComment` is false (banned or
      logged-out) and when `isReply` is true; shown otherwise.
- [x] Editor error path: on a 403/`edit_window_expired` response the entered text
      is retained, busy state clears, and the localized message renders.

Manual smoke at `localhost:3000`, EN and `/ja`:

- [ ] **Feed like-state:** liked posts show a filled/coral heart on the card;
      clicking the heart likes/unlikes **without** navigating; clicking elsewhere
      opens the post.
- [ ] **Reply:** top-level comments show Reply (replies don't; banned/logged-out
      users don't); it reveals an inline composer; submit nests the reply and
      closes the composer.
- [ ] **Comment menu:** author sees Edit + Delete; Edit swaps a textarea and Save
      persists; **Delete a top-level comment that has replies → the replies are
      removed and `comment_count` decrements correctly (no orphans, no stale
      count)**; non-author sees Report → thanks toast.
- [ ] **Edit post:** author within 15 min → Edit → `?edit=1` editor → Save
      persists and the "edited" label appears → Cancel restores; **Back button
      does not reopen the editor** (replace, not push). After the window, Edit is
      hidden on refresh and a forced stale PATCH shows the localized 403 error.
- [ ] **Report analytics:** reporting a comment emits the report event with
      `target_type: 'comment'` (check the Plausible/console event).
- [ ] **A11y:** Like, Reply, menu trigger, Save, Cancel are ≥44×44px with visible
      focus; overlay link announces "Open post by …"; no hardcoded-color leakage
      in light mode.
- [ ] **Console clean:** no `MISSING_MESSAGE` for the new keys, no React key
      warnings, **no hydration mismatch** from the `CommentItem` client conversion.

Gate + regression:

- [x] `pnpm verify` clean (type-check → tests → build).
- [x] No orphaned translation keys (Grep any key you changed).
- [ ] `pnpm test:rls` is **not required** (no RLS/migration change). Run it only
      if you want extra confidence in the delete path; it needs the documented
      022/025 temp-rename — do not commit the rename.
- [x] Adversarial code-review pass (`requesting-code-review`) over the diff;
      triage with `receiving-code-review`; re-verify after fixes.

## Review resolutions (from the adversarial plan review)

- **#1 Banned reply** → gated via `canComment` (Decision, §2).
- **#2 Comment delete counts/orphans** → physical delete via service-role +
  cascade + trigger; app-side authorship check; no migration (Decisions 5, §3).
- **#3 Stretched-link inaccessible links** → card is a nav surface by decision
  (#4); links live on the detail page; fixes invalid nested anchors.
- **#4 Edit window not time-reactive** → no timer; hidden on refresh + localized
  403 on stale attempts (Decision 6; verification reworded).
- **#5 Hydration** → `createdLabel` computed server-side, passed as a prop (§2).
- **#6 Delete authorization** → now **required**, folded into #2.
- **#7 Error UX** → specified for both editors and delete (§3, §4).
- **#8 A11y 44px** → explicit sizing + focus + overlay label (§Accessibility).
- **#9 listFeed error + feed-API parity** → `throw` on error; parity required (§1).
- **#10 replace vs push** → `router.replace` for post edit (§4).
- **#11 Report analytics mislabel** → `target_type` threaded through (§Analytics).
- **#12 Report target validation** → **not implemented**; documented as
  pre-existing debt (UI supplies valid, in-scope values). Out of scope here.
- **#13 No app tests** → proportional automated tests added (Verification); the
  DB-cascade/count behavior stays a manual smoke (needs a live DB; no RLS change).
- **#14 test:rls fragility** → dropped from the required gate (no RLS change);
  optional with the existing caveat.
- **#15 JA parity beyond labels** → error + confirm strings localized (§i18n).

## Suggested commit message

```
feat(community): finish the four half-built feed features

- feed: hydrate liked_by_me in listFeed (+ feed API parity); interactive
  heart on cards via stretched-link; card is a navigation surface
- comments: reply-to-comment (banned-gated inline composer); author
  edit/delete + report menu (new CommentMenu); physical author-delete via
  service role fixes counts + orphaned replies (no migration)
- posts: author edit UI via ?edit=1 (new PostEditor), replace-nav
- correctness: server-computed comment timestamps (hydration-safe),
  localized error UX, 44px touch targets, target_type on report analytics
- i18n: edit/save/cancel + error/confirm keys (EN/JA); generic report title

No migration; reuses existing cascade + count trigger + service-role client.
```

## Out-of-band

None — no schema change in this plan. Nothing to apply in the Supabase dashboard.
