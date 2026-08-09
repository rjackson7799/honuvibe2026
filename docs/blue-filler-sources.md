# Blue Filler — Source Data Ledger (rev 2)

**The canonical project input** for the Blue Filler industry map (`lib/blue-filler/industry-map.ts`). Every value below is labeled with one of three provenance classes — do not treat the derived classes as source facts:

- **[T] Source transcription** — text/numbers read directly off a chart or article.
- **[V] Visual interpretation** — qualitative readings of a chart that prints no values (approximate, by inspection).
- **[H] Blue Filler heuristic** — this project's own mapping rule applied to [T]/[V] inputs. Nothing marked [H] was published by Sequoia or Anthropic.

Transcribed by Claude 2026-08-08 from chart images Ryan supplied in the planning session; A1 source identity and limitations verified against the live publication 2026-08-08. **Source images (committed 2026-08-08, verified legible):** `docs/blue-filler-sources/sequioa_quadrant.webp` (S1) · `docs/blue-filler-sources/agent_domains.webp` (A1) · `docs/blue-filler-sources/radar.webp` (A2) · `docs/blue-filler-sources/exposed_occupations.webp` (A3). Each was opened and checked against the transcriptions below after upload — all figures match. These images are part of the intentional file set staged at ship time.

## Sources

| id | Publication | Figure | URL | Published | Accessed |
|---|---|---|---|---|---|
| S1 | Sequoia Capital — "Services: The New Software" (quadrant chart + article prose) | 2×2 quadrant chart | https://sequoiacap.com/article/services-the-new-software/ | 2026 | 2026-08-08 |
| A1 | Anthropic — **"Measuring AI agent autonomy in practice"** | **Figure 6** (population: **998,481 public-API tool calls**) | https://www.anthropic.com/research/measuring-agent-autonomy | **2026-02-18** | 2026-08-08 (verified) |
| A2 | Anthropic — Economic Index labor-market report: "Theoretical capability and observed usage by occupational category" radar | radar chart | https://www.anthropic.com/research/labor-market-impacts | 2026 | 2026-08-08 |
| A3 | Anthropic — same labor-market report: "Most exposed occupations" table | table | https://www.anthropic.com/research/labor-market-impacts | 2026 | 2026-08-08 |

*(Ledger rev 1 wrongly attributed A1 to the labor-market report; corrected in review round 4.)*

**Excluded from the map** (reviewed deliberately): the labor-market report's BLS-growth-vs-exposure scatter (R² = 0.027 — no usable signal) and its worker-demographics table (not an opportunity prior). The advisor transcript (2026-08-07 call) is the concept source, held by Ryan outside the repo; the plan's Context section is its canonical summary; it contributes no numeric priors.

## Source limitations (bind every downstream use)

- **S1:** the article presents the opportunity list as **illustrative, not exhaustive**; bracketed values are **labor/services-spend TAM framing**, not necessarily measured annual market revenue; the chart states no basis or geographic scope — scope is taken from article prose where stated, else recorded `unknown` (never inferred into a typed fact).
- **A1:** measures **Anthropic public-API tool-call volume**, one provider, one window ("late 2025 through early 2026"); sampled at the level of **individual tool calls**, so "deployments involving many sequential tool calls (like software engineering workflows with repeated file edits) are overrepresented" (report's own wording). **It is a directional signal of where agents are being used — NOT an adoption rate.** Legal at 0.9% means 0.9% of sampled tool calls were legal-domain; it does not establish that 0.9% of legal work or legal firms use agents.
- **A2:** the theoretical-capability layer ultimately rests on an early-2023 task-capability measure (Eloundou et al. 2023) that Anthropic notes could be updated; the radar prints no values — our readings are [V]; **`gapTier` is [H], a project heuristic, not an Anthropic classification.**
- **A3:** "observed exposure" is **task coverage under Anthropic's methodology** (share of an occupation's O*NET tasks with significant observed Claude usage), not market saturation.

## S1 — Sequoia quadrant chart (axes: OUTSOURCED↔INSOURCED × JUDGEMENT↔INTELLIGENCE)

**[T] Chart transcription** (figures exactly as labeled):

- **AUTOPILOT (outsourced × intelligence):** Insurance brokerage $140–200B · IT managed services $100B+ · Payroll & compliance $50–70B · Claims adjusting $50–80B · Accounting & audit $50–80B · Healthcare rev cycle $50–80B · Mortgage origination $30–50B · KYC/AML $30–50B · Paralegal / LPO $36B · Tax advisory $30–35B · Legal transactional $20–25B · Real estate closing $20–25B · Cost estimation $16B
- **NEXT WAVE (insourced × intelligence):** Supply chain & procurement $200B+ · Pharmacy back-office $30B+ · Wealth mgmt ops $30B+ · Medical admin $20B+ · Fund administration $15–20B
- **COPILOT (outsourced × judgement):** Management consulting $300B+ · Graphic / UX design $30B+ · Executive search $20B+ · PR & comms $20B+
- **WATCH (insourced × judgement):** Recruitment $200B+ · Advertising $100B+ · Freight brokerage $100B+ · Admin assistants $80B+ · Clinical trials / CRO $80B+ · SEO / SEM $50B+ · ERP implementation $50B+ · Corporate training $50B+ · Market research $45B · Cybersecurity $30B+ · Architecture $25B+ · Patent / IP $15–20B · Travel mgmt $15B+

**[T] Article-prose scope statements:** accounting & audit — "$50–80B outsourced in the US alone" → `scope: 'US'`; healthcare revenue cycle — "$50–80B outsourced in US" → `scope: 'US'`. No other entry's scope is stated by the source.

**Chart↔prose discrepancy:** Management consulting — chart **$300B+**, article prose **$300–400B**. Map choice: consulting is a copilot-quadrant entry and is **excluded from the v1 map**; if ever added, use the prose range `{min: 300, max: 400}` with a `sourceOverrides` note.

**[H] Map encoding rules:** `marketSizeUsdBn` — "$140–200B" → `{min: 140, max: 200}`; "$100B+" → `{min: 100, max: null}`. `basis: 'annual_spend'` for all S1 entries (the article's frame is services *spend* — "for every dollar spent on software, six are spent on services"; this is an interpretation, the chart states no basis). `scope: 'US'` only where prose says so (the two entries above); **`scope: 'unknown'` everywhere else** — an inferred geography is never encoded as a known fact. `sequoiaQuadrant` is [T] (the chart's own placement).

## A1 — Agent domains, Figure 6 of "Measuring AI agent autonomy in practice" (% of 998,481 public-API tool calls)

**[T] Transcription:** Software engineering 49.7 · Back-office automation 9.1 · Other 7.1 · Marketing and copywriting 4.4 · Sales and CRM 4.3 · Finance and accounting 4.0 · Data analysis and BI 3.5 · Academic research 2.8 · Cybersecurity 2.4 · Customer service 2.2 · Gaming and interactive media 2.1 · Document and presentation 1.9 · Education and tutoring 1.8 · E-commerce operations 1.3 · Medicine and healthcare 1.0 · Legal 0.9 · Travel and logistics 0.8

**[H] Map usage:** field name is **`anthropicAgentToolCallSharePct`** (named for what it measures). An entry takes the figure of its nearest matching A1 domain (legal-transactional/paralegal → Legal 0.9; medical admin/healthcare rev-cycle → Medicine and healthcare 1.0; accounting/tax → Finance and accounting 4.0; supply chain → the closer of Travel and logistics 0.8 / Back-office automation 9.1, noted in `promptNotes`). Omit where no domain plausibly matches. Prompt framing must present it as *"share of one provider's sampled agent tool calls — a directional signal that agentic usage in this domain is still small, not an adoption percentage."*

## A2 — Labor-market radar → `gapTier`

**[T] Chart identity:** plots theoretical AI coverage (blue) vs observed AI coverage (red) per occupational category, 0–1 scale; no printed values.

**[V] Visual reading:** largest gaps (blue ≥ ~0.7, red ≤ ~0.15): Legal · Management · Business & finance · Education & library · Life & social sciences · Architecture & engineering · Healthcare practitioners · Healthcare support · Social services; large-gap-with-moderate-observed: Arts & media, Office & admin (red ~0.35); large theoretical + substantial observed (adoption underway): Computer & math (blue ~0.95, red ~0.5); low both (physical work): Construction, Installation & repair, Transportation, Production, Agriculture, Food & serving, Grounds maintenance, Personal care, Protective service.

**[H] Tier rule (project heuristic — NOT an Anthropic classification):** `extreme` = dominant occupational category in the largest-gap list AND nearest A1 domain share ≤ ~2% · `high` = largest-gap category with A1 share ~2–10% · `moderate` = meaningful gap with visible adoption or judgment-heavy adjacency. Each entry's `promptNotes` names the occupational category used.

## A3 — Most exposed occupations (observed exposure %, labor-market report)

**[T] Transcription:** Computer programmers 74.5 (write/maintain software) · Customer service representatives 70.1 (confer with customers) · Data entry keyers 67.1 (enter data) · Medical record specialists 66.7 (**code patient data**) · Market research analysts & marketing specialists 64.8 (prepare findings reports) · Sales reps, wholesale/mfg 62.8 (contact customers, solicit orders) · Financial & investment analysts 57.2 (analyze financial information) · Software QA analysts 51.9 · Information security analysts 48.6 · Computer user support specialists 46.8

**[H] Map usage:** where a vertical overlaps one of these occupations, list the already-covered task in `crowdedTasks` so the generator steers toward **adjacent under-covered tasks** (canonical example: medical **coding** at 66.7% task coverage is contested while medical **admin** sits in S1's next-wave quadrant). Exposure = task coverage under Anthropic's methodology, not market saturation — a crowded task is a *caution* signal, not proof the market is served.
