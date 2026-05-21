# Community Feed — Plan 3: Frontend (read-only)

**Goal:** Ship the user-facing read surface — dashboard feed page + post detail page + paywall + JP LINE card + course-channels strip. Replaces the existing stub at `app/[locale]/learn/dashboard/community/page.tsx`. No composer, no like buttons, no comments creation, no moderation UI — those come in Plan 4.

**Spec:** [docs/plans/2026-05-20-community-feed-mvp-design.md](./2026-05-20-community-feed-mvp-design.md) Sections 3 (components) and 7 (Appendix B i18n keys).

---

## Logical commits

| # | Commit | What |
|---|---|---|
| 1 | `feat(community): read-only components + i18n keys` | All component files (Paywall, LineJoinCard, CourseChannelsStrip, CategoryChips, PostCard, EmptyFeed, BannedBanner, CommentItem) + `community.*` keys in en.json / ja.json |
| 2 | `feat(community): dashboard feed page (replaces stub)` | Replace [page.tsx](../../app/[locale]/learn/dashboard/community/page.tsx) with new feed page (server-fetched scope + first page; client-side category chips + load-more) |
| 3 | `feat(community): post detail page (read-only)` | New `[postId]/page.tsx` showing full post + comments thread, read-only |

---

## File structure

```
components/community/
├── CommunityPaywall.tsx        # Server — for no-access users
├── LineJoinCard.tsx            # Server — JP-only banner above feed
├── CourseChannelsStrip.tsx     # Server — preserves existing course-link cards as horizontal strip
├── CategoryChips.tsx           # Client — filter chips with active state (?category= query)
├── PostCard.tsx                # Server — one post in feed list (title, body preview, link preview, counts, pinned label)
├── PostDetail.tsx              # Server — full post body + author + comments
├── CommentItem.tsx             # Server — one comment in thread (no composer)
├── EmptyFeed.tsx               # Server — "Be the first to post"
├── BannedBanner.tsx            # Server — for banned users
├── CommunityFeed.tsx           # Server — orchestrates: scope, paywall/feed branching, LINE card, strip, feed list
└── CommunityFeedClient.tsx     # Client — wraps initial server-rendered list with category-chip refetch + load-more
```

Pages:
- Modify: `app/[locale]/learn/dashboard/community/page.tsx` (replaces stub)
- Create: `app/[locale]/learn/dashboard/community/[postId]/page.tsx`

---

## Out of scope (Plan 4)

- PostComposer, LikeButton, ReportDialog, PostMenu
- CommentThread composer (Plan 3 only shows existing comments read-only)
- `/admin/community` + `/partner/[slug]/community` moderation pages
