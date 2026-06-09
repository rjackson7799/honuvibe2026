# HonuVibe Studio — Homepage design (source of truth)

**Source:** interactive mockup produced in claude.ai/design ("Studio - HonuVibeAI"),
delivered as `HonuVibe Studio - Homepage (standalone).html`.

**Implemented faithfully in code** (rather than committing the multi-megabyte
standalone HTML, which was ~95% embedded base64 fonts that next/font already
provides). The mockup's CSS lives, scoped + token-aliased, in
[components/marketing/studio/studio.css](../../components/marketing/studio/studio.css);
its markup is the React components under
[components/marketing/studio/](../../components/marketing/studio/). If you want the
raw browser-openable mockup in git too, drop the original HTML file alongside this note.

## Token mapping (mockup `:root` → shared `--m-*`)

The mockup's palette **is** the existing HonuVibe marketing system, so studio.css
aliases the brand tokens to the single source in `styles/globals.css`:

| mockup | → | shared token | value |
|---|---|---|---|
| `--canvas` | → | `--m-canvas` | `#FDFBF7` |
| `--sand` | → | `--m-sand` | `#F5F0E8` |
| `--ink` | → | `--m-ink-primary` | `#1A2B33` |
| `--teal` | → | `--m-accent-teal` | `#0FA9A0` |
| `--coral` | → | `--m-accent-coral` | `#E8765A` |
| `--text-muted` | → | `--m-ink-secondary` | `#5A6B73` |

Warm lines, custom shadows, and radii are kept literal to match the mockup exactly.
**Teal is the brand colour** (eyebrows, links, the honu glyph, the "Studio" wordmark);
**coral is the action accent** (Start-a-Project CTA, the featured Pro tier) — exactly
the brief's "coral more prominent for action surfaces" without a rebrand.

## Homepage section order

1. Fixed nav (68px) — lockup left · `Work · Services · Industries · Process · Pricing · Contact` · coral "Start a Project"
2. Hero — editorial serif headline "Grow without growing *a team.*" + proof card with floating `3.4×` / `2 wks` stat badges
3. Featured work — 3 case studies: Kwame Brathwaite Archive · HCI · HonuVibe.AI
4. Services — 3 tiers (Pro featured)
5. Industries — Creators (featured) · Healthcare · Service Business · Professional
6. Process — 4 steps: Discover · Design · Build & ship · Care & grow
7. Closing CTA band (dark ink)
8. Footer (dark ink) — "HonuVibe *Studio*" lockup · "Made in Hawaii with Aloha"

## Locked copy / pricing specs

- **Positioning:** "HonuVibe Studio builds AI-native websites and systems for small businesses that want to grow without growing a team."
- **Tiers:** Studio Starter $500 / $25 mo · Studio Pro $2,500 / $75 mo (featured) · Studio AI-Native from $7,500 / from $200 mo.
- **Care minimums (Pricing page):** 6-mo Starter/Pro · 12-mo AI-Native · 10% annual-prepay discount.
- **Promise:** reply within one business day.
