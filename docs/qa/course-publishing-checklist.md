# Course Publishing Checklist (P2 — completeness + conversion-copy QA)

Run this before publishing or re-promoting any course. The course-detail page
(`app/[locale]/learn/[slug]/page.tsx`) already renders every section — these
sections simply **hide when their field is empty**, so a sparse course quietly
loses the trust elements that convert. This checklist is the "populate it" pass.

> Edit fields in `/admin/courses`. Anything bilingual needs a **human-reviewed JP**
> (never machine-translate to production — CLAUDE.md).

## 1. Completeness — fill every field that has content to show

| Field (admin) | Renders as | Why it converts |
|---|---|---|
| `title_en` / `title_jp` | Hero title (+ JP subtitle on EN) | Clarity |
| `description_en/_jp` | Hero subhead | The one-line pitch |
| `level` | Level badge | "Is this for me?" |
| `format` | Format badge | Live vs recorded clarity (see §3) |
| `learning_outcomes_en/_jp` | "What you'll master" list | The payoff |
| `who_is_for_en/_jp` | "Who this is for" | Self-qualification |
| `prerequisites_en/_jp` | Prerequisites | Honest expectations (risk reversal) |
| `tools_covered` | Tools badges | Concreteness |
| `total_weeks`, `live_sessions_count`, `recorded_lessons_count` | Stat line | Scope at a glance |
| `start_date` | "Next cohort starts …" | **Dates as facts, never a countdown** |
| `max_enrollment` / `current_enrollment` | Availability badge | "Small cohort" framed as quality |
| `instructors[]` (or `instructor` + `instructor_name`) | Instructor card(s) | Authority / founder trust |
| `schedule_notes_en/_jp`, `cancellation_policy_en/_jp` | Logistics box | Removes "how does it work?" |
| `materials_summary_en/_jp` | Materials table | What's included |
| `free_preview_count` | Free preview unlock | "Taste before you buy" |
| `price_usd` **and** `price_jpy` | Price display | JPY is **zero-decimal** — store yen directly, not ×100 |
| `hero_image_url` / `thumbnail_url` | Hero + sticky card | Polish |

## 2. Conversion-copy QA — the sticky/enroll area must answer 5 things

For each revenue page, confirm the enroll area (sidebar + final CTA) communicates:

1. **Format** — Live / Recorded / Self-paced (see §3).
2. **Dates as facts** — "Next cohort starts June 22." No urgency, no countdowns, no "last chance."
3. **Risk reversal** — at least one of: 14-day refund, "start with the free preview," honest prerequisites. (This is the on-brand substitute for urgency.)
4. **Price + what's included** — number, currency, and a one-line "includes …".
5. **One proof point near the CTA** — a short quote or outcome (publish it via `/admin/proof`, then it can sit beside the price).

> Tone gate: warm, factual, generous. If a line creates pressure or fear, rewrite it. (Aloha Standard: never fear-based.)

## 3. Format label consistency

`course.format` is free text and is shown verbatim on the hero badge. Keep the
vocabulary consistent across the catalog — use exactly one of:

- **Live** — has live cohort sessions
- **Recorded** — pre-recorded, watch anytime
- **Self-paced** — Vault-style, no fixed schedule
- **Hybrid** — live + recorded

Audit all published courses and normalize `format` to these values so the badges
read consistently. (A future pass can move these to an i18n enum once the data is
clean.)

## 4. Bilingual parity gate

- Every `_en` field that's shown to JP visitors needs a reviewed `_jp`.
- If a `_jp` is missing, the page falls back to `_en` — acceptable short-term, but
  flag it for translation.

## 5. Pre-publish sign-off

- [ ] All §1 fields filled (or intentionally empty)
- [ ] §2 five-point enroll copy present, on-brand (no urgency)
- [ ] `format` normalized per §3
- [ ] JP reviewed for all displayed fields
- [ ] At least one published proof point exists to show beside the price
- [ ] Priced in **both** USD (cents) and JPY (yen)
