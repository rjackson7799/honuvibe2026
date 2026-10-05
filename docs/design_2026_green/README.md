# Handoff: HonuVibe.AI site redesign (slimmed offer)

## Overview
A visual and structural redesign of the existing HonuVibe.AI site around a slimmed, three-part offer:

1. **Learn** – the Vault (paid course library, $99/mo) plus the free Honu Community.
2. **Build** – Studio services (websites, web apps, MVPs, business documents) at fixed, published tiers.
3. **Partner** – group licenses, community programs and a co-branded platform for businesses and communities.

Much of the site already exists in the codebase. The job is to **reskin and restructure the existing pages to match these designs**, retire pages that no longer fit the offer, and add the new Course and Sign In layouts.

## About the design files
The files in `pages/` are **design references built in HTML**. They show the intended look, copy and behavior. They are not production code to copy. Rebuild them in the existing codebase using its framework, component patterns, routing, auth and i18n setup.

Each `.dc.html` file opens directly in a browser (keep `support.js` and `image-slot.js` in the same folder). Styling is inline on every element, so you can inspect exact values in DevTools. Hover states are written as `style-hover="…"` attributes. Page data (lists, tiers, FAQs, testimonials) is in the `<script type="text/x-dc">` class at the bottom of each file, inside `renderVals()`.

## Fidelity
**High fidelity.** Colors, type, spacing, copy and interactions are final. Match them pixel-for-pixel, but use the codebase's own components (buttons, inputs, accordions, header, footer) restyled to these tokens. Don't add parallel one-off components.

Placeholders you should **not** ship as-is:
- `<image-slot>` elements are empty image drop zones. Use real images from the CMS or assets.
- Testimonials marked "Placeholder Name" and instructor bios are layout copy. Each page has a small note saying so; remove those notes when real content goes in.
- The Learn catalog lesson cards are illustrative ("Illustrative lesson previews for layout"). Wire them to the real lesson data.

---

## Site map and routing

| File | Route (suggested) | Status |
|---|---|---|
| `01 Home.dc.html` | `/` | Redesign of existing home |
| `02 Learn - Catalog.dc.html` | `/learn` | Redesign. Primary Learn page |
| `02b Learn - Sales landing -alt-.dc.html` | `/vault` (optional) | Alternative, conversion-focused Learn page. Build only if a separate sales landing is wanted |
| `03 Course - AI Essentials.dc.html` | `/learn/ai-essentials` | Template for **every course detail page** |
| `04 Build.dc.html` | `/build` | Replaces the old Studio page |
| `05 Partner.dc.html` | `/partner` | Replaces the old Partnerships page |
| `06 Sign In.dc.html` | `/signin`, `/signup` | One layout, two modes |

The top nav on every page is **Learn · Build · Partner**. "Sign in" goes to `/signin`. "Get started free" goes to `/signup` (Sign In in sign-up mode). In the handoff copies, internal links already point to the new pages. Any `#pricing` / `#top` placeholder anchors on About us and Contact should go to the existing routes.

Pages to retire or redirect: old Studio → `/build`, old Partnerships → `/partner`, old Vault/Tracks pages → `/learn`.

---

## Design tokens

### Colors
| Token | Hex | Use |
|---|---|---|
| `green-900` (primary ink) | `#0E3629` | Dark hero/header/section backgrounds, headings on light, primary dark buttons |
| `green-950` | `#0B2E23` | Language toggle track, deepest wells |
| `green-800` | `#16483A` | Cards and hover fills on dark, header bottom border |
| `green-700` | `#2C5A48` | Borders and chips on dark |
| `green-600` | `#4E7A66` | Secondary button border on dark, muted numerals |
| `green-400` | `#8FAA98` | Small helper text on dark |
| `green-200` | `#CBDCD1` | Body text on dark, nav links |
| `amber` (accent / CTA) | `#E9A63B` | Primary CTA fill, live dots, rotator words, active states on dark |
| `terracotta` | `#C9552F` | Eyebrows on light, link hover, small accents |
| `terracotta-dark` | `#8A3F22` | Lesson-card cover tone |
| `bronze` | `#7A5C2E` | Lesson/service card cover tone |
| `sand-50` (card) | `#FFFCF2` | Cards on cream |
| `sand-100` (page) | `#F6F1E2` | Page background, text on dark |
| `sand-200` | `#EFE7D2` | Inactive chips and bands |
| `sand-300` (border) | `#E4DAC1` | Card and divider borders on light |
| `ink` | `#16241D` | Body text on light |
| `ink-700` | `#3E4F45` | Secondary text on light |
| `ink-500` | `#5C6B62` | Meta text on light |
| `taupe` | `#8A7C63` | Captions, fine print |
| Cover tints | `#FFF3EA` `#FFE9DC` `#F2DCA8` | Text on terracotta, bronze or green covers |

Link default is `#0E3629`, hover is `#C9552F`, with no underline.

### Typography
- **Display:** Space Grotesk 500/600/700. Used for headings, numerals, logo, prices and card titles.
- **Body:** Public Sans 400/500/600 (plus 400 italic). Used for everything else.
- Google Fonts: `Space+Grotesk:wght@400;500;600;700` and `Public+Sans:ital,wght@0,400;0,500;0,600;1,400`.

| Role | Spec |
|---|---|
| H1 (hero) | Space Grotesk 700, `clamp(38px, 4.2vw, 56px)`, line-height 1.02, letter-spacing −0.04em, `text-wrap: balance` |
| H2 (section) | Space Grotesk 700, 38–46px, line-height ~1.05, letter-spacing −0.03em |
| H2 (panel/card) | Space Grotesk 700, 28px, line-height 1.08, letter-spacing −0.03em |
| H3 (card) | Space Grotesk 600/700, 20–24px, letter-spacing −0.02em |
| Hero lead | Public Sans 400, 18px, line-height 1.55, max-width 50ch |
| Body / card text | Public Sans 400, 15.5–17px, line-height 1.55–1.6 |
| Eyebrow | Public Sans 700, 12px, uppercase, letter-spacing 0.12em (terracotta on light, amber or `#8FAA98` on dark) |
| Meta / helper | 13.5–14px |
| Nav | 15px |
| Logo | Space Grotesk 700, 20px, letter-spacing −0.02em |

Text should not go below 12px.

### Spacing and layout
- Content width is `max-width: 1320px`, centered, with 32px side padding.
- Hero padding is about 44px top and 56px bottom. Section padding is about 80–96px vertically.
- Two-column grids use `repeat(auto-fit, minmax(min(100%, 480px), 1fr))`, gap 44px. They collapse to one column automatically.
- Gaps between grid and flex items: 8, 12, 14, 18, 22, 28, 44px.
- Every interactive target is at least 44px tall. Primary hero buttons are 54px tall.

### Radius
`999px` for pills, chips and the language toggle. `8px` for the header CTA. `10px` for buttons and list rows. `12px` for tabs and inputs. `14–16px` for cards and panels. `20px` for large feature blocks.

### Shadows
- Amber CTA hover: `0 12px 26px -12px rgba(233,166,59,0.6)`
- Card hover: `0 18px 40px -18px rgba(14,54,41,0.28)`
- Raised panel: `0 22px 44px -20px rgba(14,54,41,0.3)`
- Active tab (light): `0 1px 2px rgba(14,54,41,0.12)`

### Buttons
- **Primary:** fill `#E9A63B`, text `#0E3629`, Public Sans 600, 17px, height 54px, padding 0 26px, radius 10px, usually followed by a "→". On hover it moves up 2px and gets the amber shadow (`.25s ease`).
- **Secondary on dark:** transparent with a `1.5px solid #4E7A66` border, text `#F6F1E2`, same size. On hover the fill becomes `#16483A`.
- **Primary on light:** fill `#0E3629`, text `#F6F1E2`.
- **Text link CTA:** 15–16px, weight 600, ending in "→".

---

## Shared components

**Header** (all pages except Sign In). Sticky, background `#0E3629`, `1px solid #16483A` bottom border, padding 12px 32px. Left: logo and nav (Learn, Build, Partner) in `#CBDCD1`, 15px, gap 22px. Right: language toggle, then "Sign in" (`#F6F1E2`), then the header CTA (amber, 44px tall, radius 8px, 15px/600). The CTA label changes by page: "Get started free" on Home and Learn, "Join the Vault" on Course, "Start a project" on Build, "Talk to us" on Partner.

**Language toggle (EN / 日本語).** Pill with a `#0B2E23` track, `1px solid #2C5A48` border and 3px padding. Each button is at least 36×44px, 13.5px/600. Active state: `#F6F1E2` fill with `#0E3629` text (inverted on light backgrounds). Connect it to the existing i18n.

**Breadcrumb.** "Home / Learn / …" at 14px, `#8FAA98` on dark, with the current page in `#F6F1E2`.

**Rotating hero line.** A word or phrase inside a sentence swaps every 2.8–4.8s. Each new item rises in using `hv-rise` (0.55s, `cubic-bezier(.2,.7,.2,1)`), and the rotating text is amber. Examples: "Finish a lesson with ___", "We’ll build ___", "AI training for ___".

**Marquee.** Two rows of pills (one dark, one light) scrolling in opposite directions using `hv-marquee` linear infinite, with duration = items × 3.2s. Pills are 48px tall, Space Grotesk 600 17px, with a 6px dot. Edges fade with a horizontal mask. It pauses on hover. Used on Home, Build and Partner.

**Testimonial carousel (the social-proof pattern).** Used on Learn, Course, Build, Partner and Sign In. It sits on a dark green card, always next to the FAQ block (or on the left panel of Sign In). It has a large amber “ glyph, a blockquote, and a name plus role or org. It auto-advances every 6.5s; each new quote fades in and rises 8px over 0.6s. Dot controls are 6px wide, and the active dot is 18px wide in amber (inactive `#2C5A48`). Clicking a dot jumps to that quote and restarts the timer. Each page has three page-specific quotes; the copy is in each file's `QUOTES` array.

**FAQ accordion.** Rows separated by `#E4DAC1` borders, with the question in Space Grotesk 600. A "+" turns into "×" when the row is open (rotates 45°). Only one row is open at a time. Each page opens a different set of questions; the copy is in the `FAQS` arrays.

**Pricing / tier cards.** Three columns. The popular tier is filled `#0E3629` with light text, amber checkmarks, an amber button and a "Most projects" / "Most partners" badge. The other tiers are `#FFFCF2` with a `#E4DAC1` border, `#4E7A66` checkmarks and a dark button. Prices are in Space Grotesk 700.

**Newsletter ("Join the wave.").** An email field with a Subscribe button. Learn pages also have two checkbox cards (Community letter and Vault letter). On submit the form is replaced by "Thanks. Your first issue arrives this week."

**Footer.** Shows "© 2026 HonuVibe.AI" and the links Learn, Build, Partner, About us, Contact.

**Lead forms (Build brief and Partner enquiry).** Dark section with a two-column layout: promises with checkmarks on the left, the form on the right. Choices use pill toggle buttons (the active one is amber-filled). Inputs and textarea follow the codebase's form components, restyled. On submit the form is replaced by a confirmation panel ("Brief received." or "Enquiry received.").

---

## Screens

### 01 Home (`/`)
- **Hero** (dark): an eyebrow link with a pulsing amber dot ("This week in the Vault" plus a rotating lesson title), then the H1 "The online AI school that also builds with you." and the lead paragraph. Buttons: **Get started free** (primary) and **Browse the tracks** (secondary), with a small note under them. Below that is **"Three ways to work with us"**: three tab buttons (01 Learn, 02 Build, 03 Partner), each with tag chips. The active tab gets a `#16483A` fill and an amber border.
- **Right panel** (a cream card in the hero). It changes with the selected tab:
  - Learn: five track rows, a "Trending now" chip list, and a "New to AI? Start free with AI Essentials" strip.
  - Build: an image, four build types and a "Start a project" link.
  - Partner: "For your business" and "For your community" cards and a "Talk about a partnership" link.
  - Switching tabs animates the panel (opacity 0.4→1 and an 8px rise over 380ms).
- **How Learn works:** the heading "Every lesson ends with something you’ve done.", the marquee, and three numbered steps. Each step has a line that grows (scaleX 0→1) when it scrolls into view.
- **"More ways to work with us":** two large image cards, one linking to Build and one to Partner.
- **Pricing:** two cards. Honu Community is Free; The Vault is $99/month and is the dark card. The copy is in the `freePerks` and `vaultPerks` arrays.
- Newsletter, then footer.

### 02 Learn – Catalog (`/learn`)
- **Hero:** breadcrumb, H1 "Learn in the Vault", the rotating line "Finish a lesson with ___", a large search field, and "Hot" chips that fill the search. On the right is a free-lesson feature card ("Ten prompts you’ll reuse every week").
- **Hot topics:** a 4-up grid of numbered cards.
- **Catalog:** track filter chips, a "Free lessons only" switch, a result-count line, and a grid of lesson cards. Each card has a colored cover (tones listed under Colors) with a track label and an optional Free badge, then the title, a blurb, and "length · level". There is an empty state with a **Clear filters** button. The sidebar holds **Study paths** (goal links) and **Inside every lesson** (four parts of each lesson).
- **State:** `track` ('all' or a track key), `query` (matched against title, blurb and track), `freeOnly`. Filtering happens on the client in the design; in production use the real lesson API.
- Newsletter (two letters), FAQ with testimonials, a pricing strip, then footer.

### 02b Learn – Sales landing (optional alternative)
- A full-bleed photo hero, a marquee, three free-lesson cards, a "Hot topics" block with one lead card and four smaller ones, and an **Inside every lesson** carousel. The carousel has four slides that auto-play and can be paused; picking a step on the right changes the slide on the left.
- After that: five track tiles, two pricing cards, newsletter.
- The `freeLayout` setting shows three ways to lay out the free lessons: `cards` (default), `split` and `list`.

### 03 Course detail – AI Essentials (`/learn/[course]`)
Use this as the template for every course page.
- **Hero:** breadcrumb, badges (Beginner · Self-paced · course code), the H1, a Japanese subtitle line, an overview paragraph, and buttons for **Start learning in the Vault** and **Download syllabus**. A `<dl>` lists course facts. On the right is the course image and a price card ("Included in the Vault", $99 / month).
- **Sticky sub-nav** with anchor links to each section on the page. It can be turned off.
- **Sections:**
  - Who it’s for: an audience list, plus "Before you start" and "Tools you’ll use" cards.
  - Learning outcomes: a numbered grid.
  - **Curriculum accordion:** five modules. Each one shows its stage, title, length, three lessons with bullets, and a "Practice task" row. Several modules can be open at once, and an **Expand all / Collapse all** control toggles them. By default the first module is open. Open and closed cards keep the same `#E4DAC1` border.
  - Instructors: two cards with circular photos.
  - Syllabus: a dark band with PDF download rows (`pages/assets/HV-AIE100-syllabus-en.pdf`).
  - FAQ with testimonials, a closing CTA band, then footer.
- The course data (modules, lessons, outcomes and so on) is in `renderVals()`. Load it from the CMS per course.

### 04 Build (`/build`)
- **Hero:** H1 "Build in our Studio", the rotating line "We’ll build ___", and a lead paragraph. An **idea input** ("What do you want built?" plus a **Start a brief →** button) copies its text into the brief form at the bottom and scrolls there. Below it are "We build" chips. On the right is a "Recent build" card that rotates through projects every 4.8s and has pagination dots.
- **What we build:** four service cards, each with a colored header, a "From $" price, a blurb, example chips and a "Brief a ___" link. Clicking a card scrolls to the brief and pre-selects that project type.
  - Websites: from $100
  - Web apps: from $1,500
  - MVPs: from $2,500
  - Business documents: priced per scope
- **Recent work:** a 4-up image grid. Each project is labelled as client work or a concept.
- **How it runs:** four steps (Brief, then Scope and price, then Build, then Handover), with the note "~3 weeks". The active step auto-advances every 2.6s once the section is in view and pauses while the pointer is over it.
- **Pricing:**
  - Landing Page: from $100
  - Build: from $1,500 (popular)
  - System: from $2,500
  - Below the tiers: an "À la carte" add-on row, and "Hosting and maintenance from $25/month", which is required for every build.
- FAQ with testimonials.
- **Brief form:** project type pills, a textarea, then name and email. On submit it is replaced by a confirmation showing the chosen type.
- Closing band: "Rather build it yourself?" with a link to the Build with AI track.

### 05 Partner (`/partner`)
- **Hero:** H1 "Partner with HonuVibe", the rotating line "AI training for ___", and buttons for **Start a conversation** and **What we offer**. On the right is a **group license estimator**:
  - A seats slider (10–500, step 5, default 40) and three discount bands that highlight as the slider moves.
  - Discount bands:
    - 10–49 seats: 20% off, $79 per seat per month
    - 50–199 seats: 30% off, $69
    - 200+ seats: 40% off, $59
  - Outputs: price per seat, monthly total, and the saving compared with the $99 individual price.
  - **Request this quote** scrolls to the enquiry form and pre-selects "Group licenses".
- **Who we partner with:** a heading and marquee.
- **What we offer:** four offer cards (Group licenses, Custom curriculum, Co-branding, Revenue share), followed by an "Also available" grid of eight extras.
- **Member teachers:**
  - A four-step path: Learner, Builder, Mentor, Teacher. It auto-advances, and each active node glows amber.
  - A revenue split bar: 50% to the member teacher, 20% to the community, 30% to HonuVibe. The bar animates from 0 to full width when the section comes into view.
- **Partnership levels:**
  - Group licenses: from $59 per seat per month
  - Community program: quoted (popular)
  - Co-branded platform: revenue share, for communities of 250 or more
- How it runs (four steps), then FAQ with testimonials.
- **Enquiry form:** multi-select interest pills, four fields, and a "success" textarea. On submit it is replaced by a confirmation. Fallback email: partnerships@honuvibe.ai.

### 06 Sign In / Sign Up (`/signin`, `/signup`)
- A split screen.
  - **Left panel** (dark): the logo, an eyebrow, the H1, a subhead and body copy, then the testimonial carousel at the bottom.
  - **Right panel** (cream): the language toggle, Sign in / Sign up tabs, the form, a "switch mode" link, and an optional magic-link option.
- The copy changes by mode:
  - Sign in: eyebrow "Welcome back", H1 "Back to the Vault", subhead "Pick up the lesson you left off.", CTA **Sign in**.
  - Sign up: eyebrow "Join the community", H1 "Join the Vault", subhead "Start free. Finish something real with AI.", CTA **Create free account**, note "No card needed to join the community."
- The password field has a Show/Hide toggle.
- Connect to the existing auth provider. Only the presentation is new.

---

## Interactions and motion (global)
- **Easing:** `cubic-bezier(.2,.7,.2,1)` everywhere.
- **Hero intro:** each `[data-intro]` element fades up 16px over 750ms, staggered by 90ms per element after an 80ms start.
- **Scroll reveal:** each `[data-reveal]` element below the fold fades up 24px over 800ms when it enters the viewport (rootMargin −10% at the bottom). `data-reveal-delay` adds a stagger in ms.
- **Hovers:**
  - Cards move up 2–4px and get the card shadow.
  - List rows move 3–4px to the right.
  - Transitions run `.2s–.25s ease`.
- **Reduced motion:** honor `prefers-reduced-motion`. Turn off intros, rotators, marquees (they become horizontally scrollable lists), auto-advancing steps and the carousel timers.
- **Keyframes:**
  - `hv-rise`: from opacity 0, translateY(0.5em), to none.
  - `hv-marquee`: from translateX(0) to translateX(-50%).
  - `hv-pulse`: opacity 1 → 0.35 → 1 over 2s.

## Configurable options in the designs
These are design-time switches. Keep them as config or feature flags where useful:
- `showPrices` (Home, Build, Partner): hides all prices.
- `animateHero` and `scrollReveal`: motion toggles.
- `autoSteps` (Build) and `autoPath` (Partner): auto-advance on the step sections.
- `defaultTab` (Home): which of the three paths is selected first.
- `curriculumOpen` (Course): "First module", "All" or "None".
- `showSubnav` (Course): shows or hides the sticky sub-nav.
- `defaultMode` (Sign In): "Sign in" or "Sign up".
- `showMagicLink` (Sign In): shows or hides the magic-link option.
- `freeLayout` (Learn B): "cards", "split" or "list".

## Assets
- Fonts: Google Fonts (Space Grotesk, Public Sans).
- `pages/assets/HV-AIE100-syllabus-en.pdf`: the AI Essentials syllabus.
- All photos and screenshots are empty `<image-slot>` placeholders. Use real Studio project shots, partner and cohort photos, lesson stills, the course hero image and instructor portraits.
- Icons are text glyphs (→ ✓ ⌕ ✦ ↓ “ +), so no icon library is needed.

## Screenshots
`screenshots/` has a full-page capture of each page, laid out at 1440px desktop width and scaled to 924px wide. There are separate captures for Sign In and Sign Up. Image areas show as empty placeholders. Rotating text, marquees and carousels are frozen at whatever frame was showing. Use the HTML files for exact measurements.

## Files
`pages/` contains the seven design files, plus `support.js` (runtime that renders the designs in a browser), `image-slot.js` (placeholder component) and the syllabus PDF. Open any `.dc.html` file in a browser to view it.
