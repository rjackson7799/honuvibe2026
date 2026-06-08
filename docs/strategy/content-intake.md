# Content Intake — Maven Conversion Build

**Purpose:** Collect the real assets the build depends on, *before* the engineering that needs them, so nothing is blocked or rebuilt. Ryan fills these in; each build phase references this doc.

> Status legend: 🔲 needed · 🟡 partial · ✅ ready

---

## 1. Proof stories (for P1a / P1b) — 🔲

Lead with **3 specific, permissioned stories**. Vertice bilingual cohort first. "Specific beats big."

For each story:

| Field | Story 1 (Vertice) | Story 2 | Story 3 |
|---|---|---|---|
| Quote (EN) | | | |
| Quote (JP) — if to be shown to JP audience | | | |
| Person name | | | |
| Role / title | | | |
| Organization | | | |
| Concrete result / outcome (e.g., "shipped X in 5 weeks") | | | |
| Rating (optional, 1–5) | | | |
| Photo (person) — file or URL | | | |
| Org logo — file or URL | | | |
| Org URL | | | |
| **Quote permission?** (Y/N) | | | |
| **Name public?** (Y/N) | | | |
| **Logo permission?** (Y/N) | | | |
| Permission notes (who approved, when) | | | |
| Proof source (cohort / event / consulting / manual) | | | |
| Related course (slug, optional) | | | |

**Constraint:** SmashHaus must NOT appear in any public proof until its deal closes.

---

## 2. Vertice bilingual case study (for P1b) — 🔲
A short, written one-pager. Inputs needed:
- Headline / one-line outcome (EN + JP)
- Context: who Vertice is, what they needed
- What was delivered (bilingual cohort, 5 weeks, ~10 students…)
- The result (concrete)
- A pull-quote (can reuse Story 1)
- Any approved screenshots/photos + permission

---

## 3. "For Organizations" page (for P1c) — 🔲
- One-sentence **promise** for org/team buyers (EN + JP)
- Who it's for (3–5 audience bullets)
- Formats offered (e.g., private cohort, workshop, audit) — short
- What teams can expect (outcomes)
- How bilingual delivery works (1–2 lines)
- What the buyer needs to provide
- A sample engagement (1 short example) — Vertice works
- **Sales-assist CTA wording** (default: "Plan training for my team")
- One proof point to show on the page (can reuse a Story above)

---

## 4. Course completeness + copy (for P2) — 🔲
Per published course, confirm these fields are filled (Ryan via admin):
- Learning outcomes (EN/JP) · Who-it's-for (EN/JP) · Prerequisites (EN/JP)
- Tools covered · Schedule notes + dates · Materials summary (EN/JP)
- Instructor(s) + bio · Free-preview count · Price (USD + JPY)
- A **risk-reversal** line to show near the CTA (e.g., refund policy / "start with the free sample")

---

## 5. Free-lesson sample (for P3a) — 🔲
- The one practical workflow to teach (topic)
- A real **before/after** example
- A small "try-this-prompt" exercise
- The lesson asset (video URL or written walk-through)
- Beehiiv: confirm a tag/segment + double-opt-in sequence exists (or to be created)

## 6. Workbench before/after example (for P3b) — 🔲
- One real, **PII-scrubbed** scenario run: weak prompt → output → rubric score → feedback → revised prompt → better output → expert prompt
- Confirm: no user PII, no client/employer names, no secrets

---

## Engineering checkpoints summary (when Ryan is needed)
- **P0:** Stripe test-mode keys + Plausible goal setup.
- **P1a:** paste the 3 stories via `/admin/proof`.
- **P1c:** approve org page copy + JP review.
- **P2:** fill course fields + approve copy + JP review.
- **P3a/b:** free-lesson content + Beehiiv segment; pick the Workbench example.
