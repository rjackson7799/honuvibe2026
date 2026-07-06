# HonuVibe Studio — proof copy (Fable, Brief 4)

Banked copy for the Studio site's missing proof layer. **Nothing here ships until the
`[PLACEHOLDER]`s are filled with real client quotes.** Building the testimonials section is a
net-new component (`components/marketing/studio/`) — do that once quotes exist.

Rule: zero fabrication. Every quote/name/company must be real or stay a placeholder.

---

## 1. Testimonials section (net-new — biggest gap on a B2B services site)

- **Eyebrow:** In their words
- **Heading (H2):** The work speaks. So do the clients.
- **Intro line:** Real quotes from real projects — the same ones you can click above.

**Quote card format:** quote (1–3 sentences, client's own words, ideally with a specific
outcome/number) + attribution `— Name, Role, Company` (company links to its case study where one exists).

**Card 1 — angle: speed to launch**
> "[PLACEHOLDER: real client quote about how fast the project went from first call to live — e.g. the two-week concept-to-launch experience]"
> — [PLACEHOLDER: name, role, company]

**Card 2 — angle: results / ROI**
> "[PLACEHOLDER: real client quote citing a change they measured after launch — inquiries, bookings, hours saved, revenue]"
> — [PLACEHOLDER: name, role, company]

**Card 3 — angle: "didn't need to hire" / ease of working together**
> "[PLACEHOLDER: real client quote about running the new system without adding staff, or what the collaboration actually felt like]"
> — [PLACEHOLDER: name, role, company]

**How to collect these (note to the team):** A strong Studio testimonial names a specific
before-and-after in the client's own words — "we used to X, now Y" — with a number if they have
one; "great to work with" quotes are filler. To get one, email the client right after a visible
win and ask exactly two questions: "What's changed since launch?" and "What would you tell
another owner who's considering us?" — then ask permission to use their name, role, and company.

---

## 2. Case-study pull-quotes (optional; facts untouched)

One optional pull-quote slot per real case study, filled from that client:

- **Kwame Brathwaite Archive** — slot: "[PLACEHOLDER: quote from the Archive team about updating
  the print storefront themselves, or licensing inquiries arriving pre-qualified]"
  Optional sharper result hook (use only if it beats the live card): *"Concept to live storefront in two weeks. Inbound up 3.4×."*
- **HCI — Health & Care Institute** — slot: "[PLACEHOLDER: quote from HCI staff about starting
  the day with clean records instead of phone-tag and PDFs]"
  Optional result hook: *"Intake time down 70%. New hires: zero."*
- **HonuVibe.AI (in-house)** — **no pull-quote** (a self-testimonial undercuts the no-fabrication
  posture). Instead, an honest caption: *"This one's ours — which is the point. It's the demo."*

---

## 3. Open flags for Ryan (content/business calls, not copy)

- **"30+ sites shipped"** vs only 3 published case studies — back the number (does past client
  work reach 30?) or adopt a badge alternative (see below). An unbacked count is the one thing
  that can poison "Proof, not promises."
- **Legal pages** (privacy/terms) are placeholder stubs — need real content before paid client
  traffic; B2B buyers do click these.
- **Industries** — nav/footer list 4 but only "creator" has a real page; the other 3 are anchors.
  Build thin-but-real pages or trim the nav until they exist.

### "30+ sites shipped" badge — RESOLVED: hidden for now
Decision (2026-07): the badge is **removed** — the count isn't backed by published case studies
yet. The hero trust row now reads: `1-business-day reply · Made in Hawaii 🌺`. Revisit when
there's a countable, provable number, or adopt one of Fable's alternatives:
- `30+ builds shipped since [year]` (keep the count, scope it provably)
- `Live in weeks, not quarters` (cadence, no count)
- `Run by the people who teach AI` (unfakeable brand claim)

Lives in `components/marketing/studio/home-hero.tsx` (the `.trust` block).
