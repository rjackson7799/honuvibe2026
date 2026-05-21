# Document the Hero Typography Voice System in CLAUDE.md

**Date:** 2026-05-20
**Type:** Documentation only — no code or visual changes

---

## Context

The site's hero headlines have drifted from CLAUDE.md's single-rule typography spec, but the drift is **intentional and principled** — not random inconsistency. Recent editorial redesigns (about, partnerships, explore, learn) introduced an italic DM Serif Display voice for "chapter" pages, while Home and Contact use bold DM Sans for direct, conversion-focused entry points.

The problem: CLAUDE.md still says *"Headlines (EN): DM Serif Display, weight 400 only — never bold."* Every current hero violates this in some way. Future pages have no documented rule to follow, so the next page someone builds will be a coin-flip on voice — and that's how genuine inconsistency creeps in.

This plan **documents the system that already exists** so future work stays principled. No code or design changes.

---

## What's actually shipped (audit)

Three distinct hero treatments are in production:

| Voice                        | Pages                                | Font                    | Files                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------- | ------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Action** (bold sans)       | Home, Contact                        | DM Sans, `font-bold`    | [components/marketing/home/hero.tsx:29-40](../../components/marketing/home/hero.tsx#L29-L40), [components/marketing/contact/hero.tsx:17-24](../../components/marketing/contact/hero.tsx#L17-L24)                                                                                                                                                              |
| **Editorial** (italic serif) | Learn, Explore, Partnerships, About  | DM Serif Display italic | [components/marketing/learn/learn-hero.tsx:31-36](../../components/marketing/learn/learn-hero.tsx#L31-L36), [components/marketing/partnerships/editorial-hero.tsx:26-34](../../components/marketing/partnerships/editorial-hero.tsx#L26-L34), [components/marketing/explore/reel-hero.tsx:203-208](../../components/marketing/explore/reel-hero.tsx#L203-L208), [components/marketing/about/hero.tsx:28-36](../../components/marketing/about/hero.tsx#L28-L36) |
| **Section/body headings**    | (everywhere else inside pages)       | DM Serif Display 400    | Existing rule — unchanged                                                                                                                                                                                                                                                                                                                                      |

### Nav active-state colors (also intentional, also undocumented)

- Partnerships active state: **coral** (`--m-accent-coral`)
- All other active states: **teal** (`--m-accent-teal`)
- Set in [components/marketing/nav/marketing-nav-client.tsx:50-54](../../components/marketing/nav/marketing-nav-client.tsx#L50-L54) with an inline comment confirming intent

---

## The rule to codify

> **Hero headlines use one of two voices, picked by page intent:**
>
> - **Action voice** — bold DM Sans — for transactional/conversion pages where the user is being asked to *do* something (Home, Contact, future signup/checkout/CTA pages).
> - **Editorial voice** — italic DM Serif Display (weight 400) — for narrative "chapter" pages where the user is being invited to *read* (Learn, Explore, Partnerships, About, future story-driven pages).
>
> **Section headings inside a page** (h2/h3 below the hero) always use **upright DM Serif Display weight 400**, regardless of which hero voice the page opens with. This keeps the body-of-page typography stable across both hero voices.
>
> If a new page genuinely doesn't fit either bucket, default to the editorial voice and flag it for review — don't invent a third hero voice.

---

## Changes

### 1. CLAUDE.md → `### Typography` section

Update the existing line:

```diff
- - **Headlines (EN):** DM Serif Display, weight 400 only — never bold
+ - **Section headings (EN):** DM Serif Display, weight 400 only — never bold. Applies to h2/h3 inside pages.
+ - **Hero headlines (EN):** Two-voice system — see "Hero Voice System" below.
```

### 2. CLAUDE.md → add new subsection right after `### Typography`

```md
### Hero Voice System

Hero headlines use one of two voices, chosen by page intent:

- **Action voice** — bold DM Sans, tracking `-0.025em` to `-0.03em`, fluid size `clamp(40-42px, 5.5vw, 64-66px)`.
  Used for transactional/conversion pages where the user is being asked to do something.
  Current pages: Home, Contact.

- **Editorial voice** — italic DM Serif Display (weight 400), tight leading (~0.92–1.05).
  Used for narrative "chapter" pages where the user is being invited to read.
  Current pages: Learn, Explore, Partnerships, About.

Rules:
- Pick the voice from page intent, not aesthetics. CTA-first → action. Story-first → editorial.
- Section headings (h2/h3 inside a page) always stay upright DM Serif Display 400, regardless of which hero voice the page opens with.
- Don't invent a third hero voice. If a new page truly fits neither, default to editorial and flag it for review.

JP equivalents:
- Action voice → Noto Sans JP weight 700.
- Editorial voice → Noto Serif JP italic if available; otherwise Noto Sans JP weight 500 (italic serif doesn't render well in JP — use a weight contrast instead).
```

### 3. CLAUDE.md → add to `### Color Tokens (key ones)` section

Append a line documenting the nav coral exception:

```diff
  - Territory accents: `--territory-web`, `--territory-db`, `--territory-saas`, `--territory-auto`, `--territory-pro`
+ - Nav active states: teal (`--m-accent-teal`) for all primary nav links **except Partnerships**, which uses coral (`--m-accent-coral`) per [components/marketing/nav/marketing-nav-client.tsx:50-54](components/marketing/nav/marketing-nav-client.tsx#L50-L54).
```

---

## Files to modify

- [CLAUDE.md](../../CLAUDE.md) — only file touched

## Files NOT touched

- No component files
- No translation files (`messages/en.json`, `messages/ja.json`)
- No CSS or design tokens

---

## Verification

Since this is a documentation-only change, verification is reading-based:

- [ ] Open CLAUDE.md and confirm the Typography section reads coherently — the new "Hero Voice System" subsection sits right after "Typography" and before "JP Typography Rules"
- [ ] The action-voice description matches what's actually in [components/marketing/home/hero.tsx:29-40](../../components/marketing/home/hero.tsx#L29-L40) and [components/marketing/contact/hero.tsx:17-24](../../components/marketing/contact/hero.tsx#L17-L24) (font-bold, clamp sizes, tracking)
- [ ] The editorial-voice description matches what's actually in the four editorial heroes
- [ ] The nav active-state line references the correct file and line range
- [ ] No code, no visual changes — `pnpm dev` should look identical
- [ ] No build step needed (markdown-only change)

## Commit

Single commit to main:

```
docs(claude): document hero two-voice typography system + nav coral exception

The site has been running a deliberate dual-register hero system (bold sans
for action pages, italic serif for editorial pages) that wasn't in CLAUDE.md.
Document it so future pages stay principled instead of drifting.
```

---

## Out of scope (for a later decision)

These came up during the audit but are NOT part of this plan:

1. **Whether the action voice should also exist in serif.** Some sites pair bold sans heroes with light serif subheads for tension. We currently use sans for both. Worth exploring later, not now.
2. **Whether coral-active-nav specifically signals "partnerships" well.** The code comment confirms it's intentional, but no document says *why* coral vs another accent. If we add more colored nav states later, write that rule down then.
3. **JP-side audit of how italic-serif and bold-sans render in Noto Sans JP / Noto Serif JP at hero sizes.** The new doc proposes equivalents but they haven't been visually verified on the JP routes. Worth a 30-minute browser pass on `/ja/learn`, `/ja/about`, `/ja/partnerships`, `/ja/explore` before committing to the JP rule above — could become a follow-up plan.
