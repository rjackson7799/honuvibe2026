# HonuVibe.AI — Visual Asset Integration Spec
## Partnerships Page (`/partnerships`)
**Version:** 1.0 | **Date:** April 29, 2026  
**Purpose:** Transform the partnerships page from text-heavy to visually-driven, using the existing design system and component library.  
**Reference:** Compare current page (text-dominant) against visual density targets inspired by product-led SaaS sites (Supabase, Linear, Vercel).

---

## Design Principles for This Page

- **Show, don't tell.** Every value prop card and section should include a visual artifact proving the claim.
- **Visual rhythm.** Alternate between light/dark sections, text-left/text-right layouts, and full-width visual breaks.
- **Real over stock.** Use actual screenshots, course materials, and HonuHub photography. No stock photos. No AI-generated imagery per brand guidelines.
- **Bilingual visual proof.** Screenshots and materials should visibly show EN/JP content — this is a differentiator, not a footnote.

---

## Section-by-Section Asset List

### 1. Hero Section

**Current state:** Headline + body text + single CTA button. Right side is empty white space.

**Assets needed:**

| Asset | Type | Description | Dimensions | Source |
|---|---|---|---|---|
| `hero-partnership-composite.png` | Composite mockup | 3 layered, slightly rotated screenshots: (1) LMS dashboard showing a course, (2) a bilingual Gamma slide, (3) a Zoom session screenshot with Japanese participants. Arranged in a fanned card layout with subtle drop shadows. | 600×480px @2x | Screenshots from learn.honuvibe.ai + Gamma deck + Zoom recording |
| `hero-bg-gradient` | CSS/SVG | Subtle ocean-inspired radial gradient behind the composite — uses `--accent-teal-subtle` fading to transparent. Not an image file; implement as CSS. | Full-width | Design system tokens |

**Implementation notes:**
- Place composite on the right side of the hero (desktop: 2-column grid, `grid-cols-2`). On mobile, composite sits below the headline at reduced scale.
- Composite images should have `border-radius: 12px` (`rounded-xl`) and use `shadow-lg` from the design system.
- Add a slow `float` animation (existing `@keyframes float` in `globals.css`) to the top card in the stack for subtle motion.

---

### 2. "What You Get" — Feature Cards

**Current state:** 4 text-only cards (Custom Curriculum, Bilingual Delivery, Co-Branded Experience, Live + On-Demand). No icons, no images.

**Assets needed:**

| Asset | Type | Description | Source |
|---|---|---|---|
| `icon-curriculum.svg` | Icon | Custom line icon — document with sparkle/AI indicator. 48×48px. Stroke style, uses `--accent-teal`. | Design/create SVG |
| `icon-bilingual.svg` | Icon | Two overlapping speech bubbles with "EN" and "JP" labels. 48×48px. Stroke style. | Design/create SVG |
| `icon-cobrand.svg` | Icon | Two overlapping brand marks or shields. 48×48px. Stroke style. | Design/create SVG |
| `icon-live-ondemand.svg` | Icon | Play button combined with a live broadcast dot. 48×48px. Stroke style. | Design/create SVG |
| `feature-curriculum-screenshot.png` | Thumbnail | Cropped screenshot of an actual bilingual syllabus PDF or Gamma deck slide showing lesson structure. | Existing course materials |
| `feature-bilingual-screenshot.png` | Thumbnail | Side-by-side view of English and Japanese course content (teacher notes DOCX or LMS page). | Existing deliverables |
| `feature-cobrand-mockup.png` | Thumbnail | Mockup of a co-branded course page showing a partner logo alongside HonuVibe branding. | Create mockup |
| `feature-vault-screenshot.png` | Thumbnail | Screenshot of The Vault self-study library interface showing video thumbnails and categories. | learn.honuvibe.ai |

**Implementation notes:**
- Restructure each card: Icon (top-left) → Title → One-line description → Thumbnail image (bottom, `aspect-ratio: 16/9`, `object-fit: cover`, `rounded-lg`).
- Cards use existing `Card` component with `hover` prop enabled.
- Grid: 2×2 on desktop (`grid-cols-2 gap-6`), single column on mobile.
- Thumbnail images lazy-loaded with `loading="lazy"` and served via `srcset` with mobile crops per tech spec.

---

### 3. "The Process" — 4-Step Flow

**Current state:** 4 numbered steps with teal circles and text descriptions. Purely typographic.

**Assets needed:**

| Asset | Type | Description | Source |
|---|---|---|---|
| `process-flow-connector` | SVG/CSS | Horizontal connecting line or arrow between the 4 step circles. Animated dash-offset on scroll-reveal. Uses `--accent-teal`. | Implement as inline SVG |
| `process-step-1-icon.svg` | Icon | Phone/video call icon (Discovery Call). 32×32px. | Design/create SVG |
| `process-step-2-icon.svg` | Icon | Document with checkmark (Custom Proposal). 32×32px. | Design/create SVG |
| `process-step-3-icon.svg` | Icon | Gear/settings icon (Build & Prepare). 32×32px. | Design/create SVG |
| `process-step-4-icon.svg` | Icon | Rocket or play icon (Launch). 32×32px. | Design/create SVG |

**Implementation notes:**
- Replace numbered teal circles with icon-in-circle treatment: `w-16 h-16 rounded-full bg-accent-teal-subtle` containing the SVG icon.
- Add the horizontal connector line between circles on desktop. On mobile, switch to vertical connector.
- Use existing `.reveal` animation class — stagger each step by 150ms using `transition-delay`.
- Consider adding a small tooltip or mini-screenshot below each step showing a real artifact (e.g., an actual proposal PDF cover under step 2).

---

### 4. "Programs in Motion" — Case Studies

**Current state:** One card for Vertice Society (text + bullet points) and a "More partnerships launching soon" placeholder. This is the strongest section but still text-heavy.

**Assets needed:**

| Asset | Type | Description | Source |
|---|---|---|---|
| `partner-vertice-logo.png` | Logo | Vertice Society logo, transparent background. Display at ~120px wide. | Request from Vertice Society |
| `partner-vertice-photo.jpg` | Photo | Real photo from a Vertice × HonuVibe session — instructor teaching, participants engaged, or HonuHub classroom. | Session photography |
| `partner-vertice-slide.png` | Screenshot | A compelling slide from the actual AI Essentials or AI Mastery Gamma deck (bilingual content visible). | Existing Gamma decks |
| `partner-vertice-testimonial-avatar.jpg` | Photo | Headshot of a Vertice participant (with consent) for testimonial quote. | Participant photo |
| `partners-logo-wall` | Component | Grid of partner/client logos for social proof. Include: Vertice Society, HCI Medical Group, Kwame Brathwaite estate, and any others. Grayscale by default, color on hover. | Collect logos |

**Implementation notes:**
- Expand the Vertice card into a full case study block: left column = text (program name, description, metrics), right column = stacked photo + slide screenshot.
- Add a testimonial quote strip below the card — participant avatar, short quote, name/title. Use existing `Card` component with special styling.
- The "More partnerships launching soon" card should include the logo wall underneath to signal pipeline activity.
- Consider a subtle background color shift for this section — `bg-tertiary` or a very light teal wash — to visually separate it from adjacent sections.

---

### 5. "Is This Right For You?" — Audience Fit Section

**Current state:** Three columns with teal/coral/grey headers and text lists. Functional but flat.

**Assets needed:**

| Asset | Type | Description | Source |
|---|---|---|---|
| `audience-great-fit-icon.svg` | Icon | Checkmark in circle, uses `--accent-teal`. 40×40px. | Design/create SVG |
| `audience-not-right-icon.svg` | Icon | X in circle, uses `--fg-muted`. 40×40px. | Design/create SVG |
| `audience-not-sure-icon.svg` | Icon | Question mark in circle, uses `--accent-gold`. 40×40px. | Design/create SVG |

**Implementation notes:**
- Add icons above each column header.
- Convert the "Not sure?" column's CTA into a more prominent treatment — consider an inline illustration of a video call window or a small photo of Ryan to humanize the "Book a Discovery Call" action.
- Use `border-left: 3px solid` with the respective accent color on each card for visual differentiation.

---

### 6. Pricing Section

**Current state:** Three pricing cards ($5,000 / $12,000 / Custom). Clean layout but no visual hierarchy beyond price.

**Assets needed:**

| Asset | Type | Description | Source |
|---|---|---|---|
| `pricing-badge-popular` | Component/SVG | "Most Popular" or "Recommended" badge for the middle tier. Teal background, white text, `rounded-full`, positioned at top of card overlapping the border. | Implement as component |
| `pricing-tier-icons` | SVG set | Three icons representing tier complexity: (1) single document for Essentials, (2) stacked documents + video for Comprehensive, (3) custom gear/puzzle for Custom. 32×32px each. | Design/create SVG |

**Implementation notes:**
- Add a subtle scale transform to the middle card: `scale-105` with `shadow-lg` and a teal top border (`border-t-4 border-accent-teal`) to visually elevate it as the recommended option.
- Place tier icons above the tier name in each card.
- Consider adding a small "Includes:" visual checklist with teal checkmark icons instead of plain bullet points.

---

### 7. Inquiry Form — "Tell Us About Your Community"

**Current state:** Standard form on a white/light background. Functional but lacks brand warmth.

**Assets needed:**

| Asset | Type | Description | Source |
|---|---|---|---|
| `form-bg-honuhub.jpg` | Background photo | Wide-angle photo of the HonuHub learning space in Waikiki — warm, inviting, real. Used as a subtle background behind the form with a dark overlay. | HonuHub photography |
| `form-bg-ocean-pattern.svg` | SVG pattern | Alternative: subtle repeating wave or Honu shell pattern at very low opacity behind the form. Uses `--accent-teal` at 3-5% opacity. | Design/create SVG |

**Implementation notes:**
- Wrap the form section in a full-width container with the background image + dark gradient overlay (`bg-gradient-to-b from-black/60 to-black/70`), or use the subtle SVG pattern on a `bg-tertiary` background for a softer approach.
- Form card itself stays white/`bg-secondary` with `rounded-xl` and `shadow-lg` — floats above the background.
- This visual break between the pricing section and the form creates the rhythm the page currently lacks.

---

### 8. Newsletter / CTA Strip — "Join the Wave"

**Current state:** Simple text + email input + subscribe button. Fine but forgettable.

**Assets needed:**

| Asset | Type | Description | Source |
|---|---|---|---|
| `cta-wave-illustration.svg` | Illustration | Minimal ocean wave line art that spans the full width behind the text. Uses `--accent-teal` at 10-15% opacity. Purely decorative. | Design/create SVG |
| `honu-mark-small.svg` | Decorative | Small geometric Honu mark (existing `HonuMark` component) placed to the left of the "Join the wave" headline. 40×40px. | Existing `components/ocean/HonuMark` |

**Implementation notes:**
- Use existing `NewsletterSignup` component.
- Add the wave illustration as an absolutely-positioned SVG behind the section content.
- The Honu mark adds brand reinforcement without being heavy-handed.

---

## Full-Width Visual Breaks (New Sections)

These are new visual elements inserted between existing sections to create scroll rhythm.

| Location | Asset | Type | Description |
|---|---|---|---|
| Between Hero and "What You Get" | `divider-photo-strip.jpg` | Full-width photo | Panoramic shot of HonuHub space, Ryan teaching, or Waikiki setting. 100vw × 300px, `object-fit: cover`. Slight parallax on desktop (disabled on mobile per tech spec). |
| Between "Programs in Motion" and "Is This Right For You?" | `social-proof-metrics` | Component | 3-4 key metrics displayed in large type: "X+ Participants Trained", "Y Languages", "Z+ Hours of Curriculum", "100% Bilingual Delivery". Uses `font-serif` (DM Serif Display) for the numbers, `font-sans` for labels. Teal accent on numbers. |
| Between Pricing and Form | `testimonial-carousel` | Component | 2-3 rotating testimonial quotes from partners or participants. Avatar + quote + name/org. Uses existing `Card` component. Auto-advances every 6 seconds, pause on hover. |

---

## Global Visual Improvements

### Background Alternation Pattern
Alternate section backgrounds to create visual layers:

```
Hero:                 bg-primary (default)
What You Get:         bg-secondary
The Process:          bg-primary
Photo Strip Break:    Full-bleed image
Programs in Motion:   bg-tertiary (light teal wash)
Metrics Strip:        bg-primary with accent-teal numbers
Is This Right:        bg-secondary
Pricing:              bg-primary
Testimonial Break:    bg-tertiary
Inquiry Form:         Full-bleed background image
Join the Wave:        bg-primary
Footer:               bg-tertiary
```

### Scroll Animations
Apply existing `.reveal` class to all section headings and card groups. Stagger card appearances within grids by 100-150ms per card using `transition-delay`.

### Honu Scroll Companion
Enable the existing `HonuCompanion` component on this page (per tech spec §3.3) — the small geometric turtle mark that tracks scroll position along the right edge.

---

## Asset Checklist — Production Priority

### Priority 1 — Highest Impact, Implement First
- [ ] Hero composite mockup (3 layered screenshots)
- [ ] Feature card icons (4 SVGs)
- [ ] Feature card thumbnail screenshots (4 images)
- [ ] Section background alternation (CSS only)
- [ ] `.reveal` scroll animations on all sections

### Priority 2 — Case Study & Social Proof
- [ ] Vertice Society logo
- [ ] Vertice session photography (1-2 photos)
- [ ] Course material screenshot for case study
- [ ] Partner logo wall component
- [ ] Social proof metrics strip

### Priority 3 — Polish & Atmosphere
- [ ] Process flow connector line (SVG/CSS)
- [ ] Process step icons (4 SVGs)
- [ ] Pricing tier icons + "Most Popular" badge
- [ ] Inquiry form background (photo or pattern)
- [ ] Newsletter wave illustration
- [ ] Full-width photo strip divider
- [ ] Testimonial carousel component
- [ ] Honu Scroll Companion activation

---

## Photography Shot List

If organizing a photo session at HonuHub, capture the following for use across the partnerships page and site:

1. **Wide-angle HonuHub space** — chairs, screens, natural light, Waikiki visible through windows if possible. Landscape format, 2400×1200px minimum.
2. **Ryan teaching** — mid-action, gesturing at screen or whiteboard, participants visible but not identifiable from behind. Documentary style.
3. **Participants engaged** — close-up of hands on laptops, screens showing AI tools, collaborative energy. Faces optional (consent considerations).
4. **Bilingual materials on display** — printed syllabi, Gamma slides on screen, teacher notes — visually proving the EN/JP deliverables.
5. **HonuHub exterior** — building entrance or signage in Waikiki context. Establishes the physical space as real.
6. **Detail shots** — coffee, notebooks, turtle motifs in the space, anything that communicates warmth and intentionality.

---

## i18n Considerations

All new text strings introduced with these visual elements (alt text, metric labels, badge text, testimonial attributions) must be added to both `messages/en.json` and `messages/ja.json` under a `partnerships` namespace.

```json
// messages/en.json
{
  "partnerships": {
    "metrics": {
      "participants": "Participants Trained",
      "languages": "Languages",
      "curriculum_hours": "Hours of Curriculum",
      "bilingual": "Bilingual Delivery"
    },
    "pricing_badge": "Most Popular",
    "hero_alt": "HonuVibe AI training platform showing bilingual course dashboard, presentation slides, and live session"
  }
}
```

---

## File Organization

All new visual assets should follow this structure:

```
public/
├── images/
│   ├── partnerships/
│   │   ├── hero-composite.png
│   │   ├── feature-curriculum.png
│   │   ├── feature-bilingual.png
│   │   ├── feature-cobrand.png
│   │   ├── feature-vault.png
│   │   ├── vertice-session.jpg
│   │   ├── vertice-slide.png
│   │   ├── honuhub-wide.jpg
│   │   ├── honuhub-exterior.jpg
│   │   └── form-bg.jpg
│   ├── logos/
│   │   ├── vertice-society.png
│   │   ├── hci-medical.png
│   │   └── kwame-brathwaite.png
│   └── icons/
│       ├── curriculum.svg
│       ├── bilingual.svg
│       ├── cobrand.svg
│       ├── live-ondemand.svg
│       ├── process-discovery.svg
│       ├── process-proposal.svg
│       ├── process-build.svg
│       ├── process-launch.svg
│       ├── audience-fit.svg
│       ├── audience-notright.svg
│       ├── audience-notsure.svg
│       ├── tier-essentials.svg
│       ├── tier-comprehensive.svg
│       └── tier-custom.svg
```

All images served with `next/image` using `srcset` and appropriate `sizes` attribute. WebP format preferred with PNG/JPG fallbacks.
