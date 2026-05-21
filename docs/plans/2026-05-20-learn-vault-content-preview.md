# Learn Page — Surface Real Vault Content in Chapter 01

**Date:** 2026-05-20
**Owner:** Ryan (review) / execution agent (build)
**Scope:** Chapter 01 of `/learn` and `/ja/learn` — add live Vault catalog preview
**Status:** Ready to execute

---

## Context

Chapter 01 today sells the Vault with **generic bullets** ("100+ lessons across 6 libraries", "Bilingual EN / 日本語 toggle"). Meanwhile `/learn/vault` shows the actual catalog — 27 real items across 7 content types with rich thumbnails and concrete titles like *AI Ethics: What Every Professional Should Know*, *Getting Started with NotebookLM for Research*, *Building a Personal AI Workflow*.

Visitors deciding between the $29 Community and $49 Vault tiers have no idea what's actually inside the Vault before they pay. Bring the proof onto the Learn page: real titles, real content-type breakdown, and a curated "hot topics" strip pointing at the tools people actually want to learn (Claude, Obsidian, NotebookLM, Hermes, etc.).

---

## What changes

### 1. Replace bullet 1 with live content-type breakdown

Currently `learn.chapter_vault.vault.bullet_1` = `"100+ lessons across 6 libraries"`.

Replace with a **dynamic count line** derived from the live query:

> `27 lessons — videos, articles, guides, templates, tools, recordings`

Then keep the remaining 3 bullets ("Bilingual EN / 日本語 toggle", "New content drops every month", "Searchable & bookmark-able"). The "Members-only community access" bullet was already dropped when we added the explicit "Honu Community included" callout.

### 2. New "What's inside" preview row (between pricing block and sample video)

A new section, **`LearnVaultPreview`**, rendered between the two pricing cards and the existing "Try a Vault lesson, free." video sample. Layout:

```
─── What's inside the Vault ──────────────────── 27 lessons · growing monthly

★ Hot topics: Claude · Obsidian · NotebookLM · Hermes · AI Agents · Workflows

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ [thumb]  │ │ [thumb]  │ │ [thumb]  │ │ [thumb]  │   (random sample of 4
│ VIDEO    │ │ ARTICLE  │ │ GUIDE    │ │ TEMPLATE │    real Vault items)
│ 22 min   │ │          │ │          │ │          │
│ Title    │ │ Title    │ │ Title    │ │ Title    │
│ desc…    │ │ desc…    │ │ desc…    │ │ desc…    │
│   🔒     │ │   🔒     │ │   🔒     │ │   🔒     │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

                                          Browse all 27 lessons →
```

- **Title strip** uses live total: `"{count} lessons · growing monthly"`
- **Hot topics chips** are a curated TS constant — each chip links to `/learn/vault?tag=<encoded>`
- **4 sample cards** are real Vault items, picked at random server-side per request (fetch ~12, shuffle, slice 4 — keeps it cheap and avoids needing a Postgres `random()` query)
- Each card uses the existing `VaultContentCard` with `locked={true}` — clicking goes to `/learn/auth?intent=vault&redirect=/learn/vault/<slug>` (sign-in gate; after auth the user lands on that lesson)
- **"Browse all N lessons →"** link at the bottom-right routes to `/learn/vault`

### 3. Hot topics curated list (controlled by Ryan)

Lives in a new constant file so Ryan can edit without touching component code:

```ts
// lib/constants/vault-hot-topics.ts
export const VAULT_HOT_TOPICS = [
  'Claude',
  'Obsidian',
  'NotebookLM',
  'Hermes',
  'AI Agents',
  'Workflows',
];
```

Each chip's href: `/learn/vault?tag=${encodeURIComponent(topic)}`

⚠️ **Caveat to flag during execution:** the tags listed above must actually exist on at least one published Vault item, OR `/learn/vault` must support a `?tag=` query param. If neither is true, clicking a chip lands on the Vault index with no filter applied (acceptable degradation) or with an empty result (worse). Verification step covers this.

---

## Files

### New

| File | Purpose |
|---|---|
| `lib/vault/queries.ts` | **Add** `getVaultRandomSample(limit)` and `getVaultContentTypeCounts()` next to existing `getVaultTrending`/`getVaultBrowse`. |
| `lib/constants/vault-hot-topics.ts` | Curated `VAULT_HOT_TOPICS` tag list. |
| `components/marketing/learn/learn-vault-preview.tsx` | New server component — renders the title strip + hot topic chips + sample card grid + "Browse all" link. |

### Modified

| File | Change |
|---|---|
| `app/[locale]/learn/page.tsx` | Extend `Promise.all` to also fetch `getVaultRandomSample(12)` and `getVaultContentTypeCounts()`; pass results to `LearnChapterVault`. |
| `components/marketing/learn/learn-chapter-vault.tsx` | Accept new props `vaultSample`, `vaultTypeCounts`, `vaultTotalCount`. Replace `bullet_1` with the live count line. Render `<LearnVaultPreview>` between the pricing block and `<LearnVaultSample>`. |
| `messages/en.json` + `messages/ja.json` | Add `learn.chapter_vault.preview.*` namespace: `heading`, `total_count` (ICU `{count}`), `growing_monthly`, `hot_topics_label`, `browse_all` (ICU `{count}`), and `types.video`/`article`/`guide`/`template`/`tool`/`recording` for the count line. Drop the now-unused `vault.bullet_1` (or repurpose to the new count copy). |

### Reused as-is

- `components/vault/VaultContentCard.tsx` — already supports `locked`, `onLockedClick`, locale-aware titles. Pass `locked={true}` and either omit `onLockedClick` (default behavior) or wire it to push the user to `/learn/auth?intent=vault&redirect=...`.
- `getActivePublicPartners` pattern from existing `learn/page.tsx` `Promise.all` — match the idiom.
- `Container`, `Section` primitives.

---

## Query implementation notes

### `getVaultRandomSample(limit: number)`

PostgREST doesn't expose `ORDER BY random()` cleanly. Two simple options:

1. **Application-side shuffle** *(recommended for current scale)*: fetch up to `limit * 3` recent published items, `Array.shuffle()`, return first `limit`. Cost: ~12 rows over the wire per page render. Fine for 27 items, fine if we grow to a few hundred.
2. **Postgres function**: add a `vault_random_sample(n int)` RPC that does `SELECT ... ORDER BY random() LIMIT n`. More correct, more migration churn.

Go with option 1. If the catalog grows past ~1k, revisit.

### `getVaultContentTypeCounts()`

Returns `Record<ContentType, number>` plus `total`. Implementation: a single `select('content_type')` filtered to `is_published=true`, grouped client-side. Cheap.

Both new functions live next to `getVaultBrowse` at `lib/vault/queries.ts`.

---

## Layout decision — why preview goes between pricing and video sample

- **Pricing first** because the intent picker on the hero already routed the visitor here on the basis of "I want to learn at my own pace"; the offer is what they came for.
- **Preview next** so the post-pricing question ("but what's actually in there?") gets answered immediately with real cards and topics.
- **Free sample lesson last** because by then they're sold conceptually and one specific lesson trailer closes the loop.

Anchor `#vault` stays on the Chapter 01 wrapper so the intent picker's scroll target is unchanged.

---

## i18n keys (proposed)

```jsonc
"learn": {
  "chapter_vault": {
    // … existing …
    "vault": {
      // … existing keys except bullet_1 …
      "bullet_1": "{count} lessons — videos, articles, guides, templates, tools, recordings"
    },
    "preview": {
      "heading": "What's inside the Vault",
      "total_count": "{count} lessons",
      "growing_monthly": "growing monthly",
      "hot_topics_label": "Hot topics",
      "browse_all": "Browse all {count} lessons"
    }
  }
}
```

JP parallel: idiomatic translations — flag in completion report. Suggested:

- `heading`: `"ヴォルトの中身"`
- `total_count`: `"{count}本のレッスン"`
- `growing_monthly`: `"毎月追加"`
- `hot_topics_label`: `"注目トピック"`
- `browse_all`: `"すべての{count}本を見る"`
- `vault.bullet_1`: `"{count}本のレッスン — 動画・記事・ガイド・テンプレート・ツール・録画"`

Hot topic chip labels stay as-is (brand names like "Claude" / "Obsidian" / "NotebookLM" / "Hermes" don't translate).

---

## Verification

1. `pnpm type-check` clean — new component, new queries, new constant all type-check.
2. `pnpm dev` then probe:
   - `http://localhost:3000/learn` Chapter 01 shows: pricing block → preview row with real titles + hot topic chips → existing sample video.
   - The "27 lessons" count matches reality (or whatever the actual published count is).
   - Refresh 3× — the 4 sample cards differ each time (proves randomization).
   - Click each hot topic chip — verify either the `/learn/vault?tag=<x>` URL filters correctly OR the page shows a graceful fallback (no console error, no broken layout). If filter param isn't supported by `/learn/vault`, flag for follow-up.
   - Click a sample card lock → lands on `/learn/auth?intent=vault&redirect=/learn/vault/<slug>` (or whatever the established lock-click pattern is — match `VaultContentCard`'s existing `onLockedClick` contract).
3. `http://localhost:3000/ja/learn` — JP locale shows JP card titles (the `VaultContentCard` already handles locale), JP preview heading + chips label.
4. Zero `MISSING_MESSAGE` console warnings on either locale.
5. Mobile 375px — preview cards stack 1-up, hot topic chips wrap, "Browse all" link still readable.
6. `pnpm build` clean.
7. Cross-page sanity — home, `/ja`, `/partnerships`, `/learn/vault` itself all 200 with no missing messages (the new query functions live alongside existing ones and shouldn't disturb other pages).

---

## Out of scope (flag for follow-up)

- **Seeding the hot topic tags** onto real Vault items in Supabase — if Ryan wants "Obsidian" / "NotebookLM" / etc. chips to actually filter usefully, the items themselves need those tag strings. Plan adds the chips with the curated list; tag seeding is an admin/data task.
- **`/learn/vault?tag=` filter** — if the Vault index page doesn't already honor this query param, clicking a topic chip will land on the unfiltered index. Plan does not extend the Vault page; flag if missing.
- **Postgres `random()` RPC** — application-side shuffle is fine for current scale; upgrade only if the catalog grows past ~1k items.
- **Localizing the hot topic chips beyond the label** — chip values stay as English brand names; only `hot_topics_label` is translated.
- **Lighthouse performance pass** — the additional fetch is small (~12 rows + count query) but worth a Lighthouse run if Ryan wants pre-launch performance certified.

---

## Suggested commit message

```
feat(learn): surface real Vault content in Chapter 01 — preview + hot topics

Replaces the generic "100+ lessons across 6 libraries" bullet with a live
count line, and adds a "What's inside the Vault" preview row between the
pricing block and the free sample video:

- 4 random Vault items (real titles, types, durations, locked overlay)
- Curated hot topic chips: Claude, Obsidian, NotebookLM, Hermes,
  AI Agents, Workflows — each filters /learn/vault?tag=<x>
- "Browse all {N} lessons →" link to /learn/vault

Adds two new queries (getVaultRandomSample, getVaultContentTypeCounts)
to lib/vault/queries.ts. Reuses VaultContentCard. JP locale supported.
```
