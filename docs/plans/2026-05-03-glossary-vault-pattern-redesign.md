# Glossary — Vault Pattern Redesign

## Context

The `/glossary` index (and its detail pages) is the only public reference page still on the dark **app shell**. Today it renders a flat, app-themed layout — overline + title + body, then a search input with text-only category chips, term count, A-Z jumper, and a list of term cards. The look feels disconnected from the rest of the public marketing surface (home, about, explore, partnerships, contact, learn) which now consistently uses the cream **marketing shell** (`[data-shell="marketing"]` → `--m-*` tokens, MarketingNav, MarketingFooter).

The recent **Home Vault** redesign ([components/marketing/home/vault-section.tsx](components/marketing/home/vault-section.tsx), plan: [docs/plans/2026-05-01-home-vault-section-redesign.md](docs/plans/2026-05-01-home-vault-section-redesign.md)) established a clean centered-hero pattern: coral overline → DM Serif headline with a **seafoam italic emphasis word** (rendered via `t.rich`) → body paragraph → wrapping row of **icon-pill chips** (lucide icons, seafoam stroke) → primary teal CTA button.

This plan ports the glossary into the marketing shell and applies that same hero treatment. The glossary's category filter chips become the icon-pill row (functional, not decorative), search and A-Z stay below as utility controls, and term cards / detail pages are reskinned with `--m-*` tokens. Per scope decisions: **no featured-term hero showcase** (skip the analog of the lesson mockup), and **both index and detail pages switch to the marketing palette** for consistency.

---

## Recommended approach

1. **Marketing shell wrap.** Both [app/[locale]/glossary/page.tsx](app/[locale]/glossary/page.tsx) and [app/[locale]/glossary/[slug]/page.tsx](app/[locale]/glossary/[slug]/page.tsx) wrap their tree in `MarketingShell` + `MarketingNav` + `MarketingFooter` (+ optional `MarketingNewsletter`), matching the structure of [app/[locale]/about/page.tsx](app/[locale]/about/page.tsx).
2. **Marketing route registration.** [lib/marketing-routes.ts](lib/marketing-routes.ts) must recognize the glossary so `ConditionalMain` ([components/layout/conditional-nav.tsx:29](components/layout/conditional-nav.tsx#L29)) skips its dark `pt-14 md:pt-16` padding. Switch the existing exact-match list to a prefix-aware check that also matches `/glossary` and `/glossary/<slug>`.
3. **Hero (vault pattern).** Centered column, `max-w-[720px]`, using marketing primitives:
   - `Overline tone="coral"` → "Glossary"
   - `SectionHeading` rendering `t.rich('title', { em })` — emphasis word "Glossary" in `text-[var(--m-seafoam)]`, italic only when `locale === 'en'` (DM Serif via `--font-dm-serif`)
   - Body paragraph: `text-[16.5px] leading-[1.7] text-[var(--m-ink-secondary)]`
   - **Icon-pill chip row** = the live category filter (5 chips: All, Core Concepts, Models & Architecture, Tools & Platforms, Business & Strategy). Active chip uses filled `--m-accent-teal-soft` bg + `--m-accent-teal` text + `--m-border-teal`; inactive uses white bg + `--m-seafoam` icon stroke + `--m-border-default`.
   - **No top CTA button.** The existing `CtaStrip` at the bottom of the page already drives to `/learn`; a second hero CTA would be redundant.
4. **Search + utility row.** Move `GlossarySearch`'s text input below the hero as a standalone control (without its own embedded chip row — chips now live in the hero). Term count moves next to or under the input.
5. **A-Z jumper restyle.** Active letter → `--m-accent-teal` background with white text; inactive → `--m-ink-tertiary`; disabled → `--m-ink-tertiary` at 35% opacity. Sticky behavior unchanged.
6. **Term card restyle.** White card (`bg-[var(--m-white)]`), `--m-border-default` border, `--m-ink-primary` term name, `--m-ink-secondary` definition, hover lifts to `--m-shadow-sm` + `--m-border-strong`. `DifficultyBadge` color map: beginner → `--m-accent-teal`, intermediate → `--m-accent-coral`, advanced → `--m-ink-tertiary`.
7. **Detail page restyle.** Re-skin [app/[locale]/glossary/[slug]/page.tsx](app/[locale]/glossary/[slug]/page.tsx) and `RelatedTerms` to marketing tokens; wrap in `Section variant="canvas"` + marketing `Container`. Keep schema/JSON-LD logic untouched.
8. **CTA strip swap.** Replace the dark-themed `CtaStrip` import in `GlossaryIndexContent` with a marketing equivalent. Reuse `Section variant="sand"` + `SectionHeading` + `Button variant="primary-teal"` inline rather than introducing a new component.

### Category chip icons (lucide-react)

| Category | Icon |
|---|---|
| All | `LayoutGrid` |
| Core Concepts | `Lightbulb` |
| Models & Architecture | `Cpu` |
| Tools & Platforms | `Wrench` |
| Business & Strategy | `Briefcase` |

---

## Files to modify

| File | Change |
|---|---|
| [lib/marketing-routes.ts](lib/marketing-routes.ts) | Add `/glossary` to `MARKETING_PATHS` and switch matching from exact-equality to prefix-aware (`/glossary/anything` should also match). Update the doc comment that currently says "only the EXACT route is marketing". |
| [app/[locale]/glossary/page.tsx](app/[locale]/glossary/page.tsx) | Wrap in `MarketingShell` + `MarketingNav` + `MarketingFooter` (+ `MarketingNewsletter` to match other marketing pages). Drop the legacy `Section`/`Container`/`SectionHeading` imports. Pass updated category options + icons to `GlossaryIndexContent`. |
| [app/[locale]/glossary/[slug]/page.tsx](app/[locale]/glossary/[slug]/page.tsx) | Same shell wrap. Replace dark layout primitives with marketing `Section variant="canvas"` + `Container`. Re-skin headings/body to `--m-ink-*`. |
| [components/glossary/GlossaryIndexContent.tsx](components/glossary/GlossaryIndexContent.tsx) | Restructure: render hero (overline + serif heading with italic emphasis + body + icon chip filter row) inside the page tree (was previously rendered outside in `page.tsx`). Move chips out of `GlossarySearch`. Inline a marketing-themed CTA at the bottom in place of `CtaStrip`. |
| [components/glossary/GlossarySearch.tsx](components/glossary/GlossarySearch.tsx) | Strip the chip-rendering JSX (chips now live in the hero). Keep the debounced search-input only. Switch to `--m-*` tokens for input bg/border/focus/placeholder. Lift `activeCategory` state up to `GlossaryIndexContent` (or pass it down via props) so hero chips and search filter share state. |
| [components/glossary/GlossaryAlphaNav.tsx](components/glossary/GlossaryAlphaNav.tsx) | Replace `bg-bg-primary`, `border-border-secondary`, `text-accent-teal`, `text-fg-secondary`, `text-fg-muted` with `--m-*` equivalents. Sticky offset stays `top-[var(--m-nav-h)]` (nav height token). |
| [components/glossary/GlossaryTermCard.tsx](components/glossary/GlossaryTermCard.tsx) | Switch all classNames to `--m-*` palette per §6 above. |
| [components/glossary/DifficultyBadge.tsx](components/glossary/DifficultyBadge.tsx) | Color map → marketing accents (teal / coral / ink-tertiary). |
| [components/glossary/RelatedTerms.tsx](components/glossary/RelatedTerms.tsx) | Pill bg/border/text → marketing tokens. |
| [messages/en.json](messages/en.json) | Inside `glossary` block: convert `title` to a rich-tag string (`"AI <em>Glossary</em>"` or `"The AI <em>Glossary</em>"` — pick one in implementation), keep all existing keys. No new keys needed (filter labels already exist). |
| [messages/ja.json](messages/ja.json) | Mirror EN structure with `<em>` tags wrapping the equivalent JP emphasis word. JP rendering omits italic per the vault locale-aware pattern. |
| [__tests__/glossary/*](__tests__/) | Update any existing glossary index tests that assert against `<Section>` from `components/layout/section`, `bg-bg-primary` classNames, or the previous chip location. (Verify presence first; may not exist.) |

No new files. Components stay in `components/glossary/`; no parallel `components/marketing/glossary/` directory needed since these aren't reused elsewhere.

---

## Reusable building blocks (already in the repo)

- **MarketingShell** — [components/marketing/shell.tsx](components/marketing/shell.tsx). Activates `[data-shell="marketing"]` so `--m-*` tokens and Inter font apply.
- **MarketingNav / MarketingFooter / MarketingNewsletter** — [components/marketing/nav/marketing-nav.tsx](components/marketing/nav/marketing-nav.tsx), [components/marketing/footer/marketing-footer.tsx](components/marketing/footer/marketing-footer.tsx), [components/marketing/newsletter/marketing-newsletter.tsx](components/marketing/newsletter/marketing-newsletter.tsx). Same chrome the home/about/explore pages use.
- **Marketing primitives** — [components/marketing/primitives/](components/marketing/primitives/):
  - `Section` (variants `canvas` / `sand` / `navy` / `gradient`, spacings `default` / `hero` / `tight` / `flush`)
  - `Container` (max-width 1200px, standard padding)
  - `Overline` (`tone="coral"` matches vault hero)
  - `SectionHeading` (renders DM Serif, supports children for `t.rich` emphasis spans)
  - `Button` (`variant="primary-teal"`, `withArrow`)
  - `Badge`, `Card` available if useful for term cards or empty state
- **Vault hero reference** — [components/marketing/home/vault-section.tsx:26-76](components/marketing/home/vault-section.tsx#L26-L76). The exact `t.rich` italic-emphasis pattern + chip row markup to mirror.
- **lucide-react icons** — already a dependency, used by vault chips. Pull `LayoutGrid`, `Lightbulb`, `Cpu`, `Wrench`, `Briefcase` for the category chips.
- **Marketing tokens** — [styles/globals.css](styles/globals.css) lines ~394–476: `--m-canvas`, `--m-sand`, `--m-white`, `--m-ink-primary/secondary/tertiary`, `--m-accent-teal[/-dark/-soft]`, `--m-accent-coral[/-dark/-soft]`, `--m-seafoam[/-light/-pale/-faint]`, `--m-border-soft/default/strong/teal/coral`, `--m-shadow-xs/sm/md/lg/xl`, `--m-radius-sm/md/lg/xl/2xl`, `--m-nav-h`, `--m-section[-mobile]`, `--m-text-overline`. **No new tokens required** — the seafoam, code, and shadow palettes added during the vault redesign cover everything the glossary needs.

---

## Verification

1. `pnpm typecheck` — strict-mode clean, no `any`.
2. `pnpm test` — all suites pass; update or add glossary index tests if existing ones break on the new layout/tokens.
3. `pnpm dev` and visit `/glossary`:
   - Cream canvas background, `MarketingNav` at top (not the dark app nav), `MarketingFooter` at bottom.
   - Centered hero: coral "GLOSSARY" overline, big serif title with "Glossary" rendered seafoam + italic, descriptive paragraph below.
   - Five icon-pill category chips wrap centered under the body; clicking a chip filters the term list immediately and toggles its `--m-accent-teal-soft` active state. "All" chip is active by default.
   - Search input below the hero, debounce ~150ms, narrows the visible terms in combination with the active category chip.
   - Term count line + A-Z jumper render in marketing palette; sticky A-Z stays under `MarketingNav`.
   - Term cards in white with marketing borders; difficulty badges show teal (beginner) / coral (intermediate) / ink-tertiary (advanced).
   - Bottom CTA section (replacing `CtaStrip`) renders `Section variant="sand"` with teal primary button to `/learn`.
4. Visit `/ja/glossary`:
   - Hero emphasis word renders seafoam **without italic**.
   - All chip labels and CTA copy in JP.
5. Visit `/glossary/<some-slug>` (e.g. `/glossary/llm`):
   - Same marketing chrome.
   - Detail page renders in marketing palette; "Why It Matters", "Example", "Related Terms" sections styled with `--m-*` tokens.
   - "Back to Glossary" link works and lands back on the new index.
6. Resize to ~375px and confirm:
   - Chip row wraps to multiple lines and stays centered.
   - Search input and A-Z remain usable; term cards stack cleanly.
7. Confirm Plausible analytics events still fire (`glossary_view`, `glossary_search`, `glossary_filter`, `glossary_related_click`) — no event names changed, only styling.
8. Lighthouse mobile run on `/glossary` — confirm LCP < 2.5s and CLS unchanged from the previous design.

---

## Out of scope

- No featured-term / term-of-the-day hero card (explicit decision).
- No new Sanity schema fields, GROQ queries, or term content changes.
- No translation review of JP emphasis-word choice (flag in commit description for Mizuho review, like the vault redesign did).
- No A/B test instrumentation.
- No changes to `/glossary/[slug]` content structure — only its visual shell.
