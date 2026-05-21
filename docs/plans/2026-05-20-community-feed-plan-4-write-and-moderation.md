# Community Feed — Plan 4: Write surface + Moderation

**Goal:** Ship the final phase — composers, likes, comments, reports, post menu, and the admin/partner moderation dashboards. After this plan, the MVP is feature-complete.

**Spec:** [docs/plans/2026-05-20-community-feed-mvp-design.md](./2026-05-20-community-feed-mvp-design.md) Sections 4 (posting flow), 5 (moderation).

---

## Logical commits

| # | Commit | What |
|---|---|---|
| 1 | `feat(community): composers + likes + analytics wiring` | `PostComposer`, `LikeButton`, `CommentComposer`; fires `community_post_created`/`comment_created`/`post_liked` analytics; wires `paywall_viewed` + `paywall_cta_clicked` + `line_join_card_clicked` |
| 2 | `feat(community): post menu + report dialog` | `PostMenu` (3-dot menu with Report/Edit/Delete for members); `ReportDialog` modal; wires `community_post_reported` |
| 3 | `feat(community): moderation dashboards (admin + partner)` | Shared `ModerationDashboard` component (3 tabs: Reports / All posts / Banned), `/admin/community` page, `/partner/[slug]/community` page; mod actions (pin/hide/delete/ban) added to PostMenu when user is a moderator |

---

## Files

```
components/community/
├── PostComposer.tsx            # Client — markdown textarea + link preview + submit
├── CommentComposer.tsx         # Client — textarea + parent_comment_id + submit
├── LikeButton.tsx              # Client — optimistic toggle
├── PostMenu.tsx                # Client — "..." menu; renders member actions + mod actions if canModerate
├── ReportDialog.tsx            # Client — reason radio + 200-char note + submit
└── (Plan 3 components reused)

components/admin/community/
└── ModerationDashboard.tsx     # Client — 3 tabs, shared by admin + partner admin pages

app/[locale]/admin/community/page.tsx          # NEW (HonuVibe admin scope)
app/[locale]/partner/[slug]/community/page.tsx # NEW (partner admin scope)
```

Modifications:
- `components/community/CommunityPaywall.tsx` — fire `paywall_viewed` on mount, `paywall_cta_clicked` on CTA click (needs to become a client component or split)
- `components/community/LineJoinCard.tsx` — fire `line_join_card_clicked` (client wrapper)
- `app/[locale]/learn/dashboard/community/page.tsx` — render `<PostComposer />` above feed; pass `canModerate` flag to `<PostCard />` if useful (deferred; PostMenu computes it from the post's `partner_id` against current user)
- `app/[locale]/learn/dashboard/community/[postId]/page.tsx` — render `<LikeButton />`, `<CommentComposer />`, `<PostMenu />`

---

## Out of scope (future specs)

- Image / video / file upload
- @mentions, hashtags, search
- DMs, notifications, email digests
- Members directory, leaderboards
