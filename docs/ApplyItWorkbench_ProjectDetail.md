# Apply-It Workbench — Project Detail

**HonuVibe.AI | Self-Study Prompting Practice Tool**
*Product brief for build-out. Technical implementation to be handled in-codebase.*

---

## Overview

The Apply-It Workbench is a standalone self-study tool inside the HonuVibe LMS that teaches **prompting through active practice**, not passive consumption. Students take a real business scenario, write a prompt, see the actual AI output, and get scored feedback on the prompt itself against a named rubric — then revise and compare against an expert version.

It closes the gap every AI course leaves open: people watch a lesson on prompting and never actually practice it. The Workbench makes prompting a repeatable, gradeable skill with a tight feedback loop.

**Positioning:** Sits alongside Cohorts, Community, and the Vault as the fourth pillar of the HonuVibe learning experience — the "apply it" half of *Learn AI. Apply It. Move Forward.*

---

## Locked Decisions

| Decision | Choice |
|---|---|
| MVP scope | Small library, 10–20 scenarios across 2–3 domains |
| Placement | Standalone tool inside the LMS (not embedded in Vault lessons for v1) |
| Languages | EN + JP from launch |
| Access | Gated by Vault tier |

---

## Core User Loop

1. **Pick a scenario** — student browses the scenario library, filters by domain/difficulty, selects one.
2. **Read the brief** — scenario presents a realistic task with context (the situation, the goal, who the output is for).
3. **Write a prompt** — student composes their prompt in a text editor.
4. **Run it** — the tool executes the student's prompt live and shows the real AI output.
5. **Get scored** — the tool evaluates the *prompt* (not the output) against the rubric, returning per-dimension scores, strengths, and specific improvements.
6. **Compare** — student reveals the expert prompt and its output side-by-side with their own. Seeing the output difference is the lesson.
7. **Revise or save** — student rewrites and resubmits (versioned), or saves a strong prompt to their personal library.

---

## The Rubric

The heart of the tool. Prompts are scored on named dimensions so students learn the *vocabulary* of prompting, not just vibes. Each dimension gets a score, a short rationale, and an actionable fix.

| Dimension | What it measures |
|---|---|
| **Role / Persona** | Did the prompt assign the AI a relevant role or expertise frame? |
| **Context** | Did it supply the background the task needs? |
| **Task Specificity** | Is the ask clear, scoped, and unambiguous? |
| **Constraints** | Did it set length, tone, audience, and what to avoid? |
| **Output Format** | Did it specify structure (list, table, sections, etc.)? |
| **Examples** | Where useful, did it provide a sample or few-shot guidance? |

**Adaptive weighting:** Not every scenario needs every dimension (e.g. few-shot examples aren't always relevant). Each scenario declares which dimensions are *applicable*, and scoring only reflects those. This keeps feedback honest and avoids penalizing students for omitting something the task didn't call for.

**Output:** An overall score plus a per-dimension breakdown, a short list of strengths, and a short list of prioritized improvements. Feedback is returned in the student's active language.

---

## Evaluation Behavior

Two distinct AI passes, conceptually:

- **Executor** — runs the student's prompt exactly as written and returns the real output. No coaching, no cleanup. Students must see what their prompt actually produces, warts and all.
- **Evaluator** — assesses the student's prompt against the scenario's applicable rubric dimensions and returns structured scores + feedback. The evaluator critiques the *prompt*, not the output quality.

The **expert prompt and its output are pre-authored and stored with each scenario** (not generated live) so the comparison is consistent, fast, and cheap. The student's output is the only thing generated on demand.

---

## Feature Set

**v1 (launch):**

- **Side-by-side output comparison** — student output vs. expert output for the same scenario. The visible quality delta is the core teaching moment.
- **Rubric scoring with named dimensions** — teachable, specific, vocabulary-building.
- **Prompt versioning** — track v1 → v2 → v3 of a student's attempts on a scenario, with the ability to see how scores moved.
- **Personal prompt library** — save strong prompts, tag them, reuse them.
- **Domain packs** — scenarios grouped by job context (see below).
- **Bilingual scenarios** — every scenario authored in EN and JP; students can practice and be evaluated in either language.

**Differentiator to include if cheap, otherwise v2:**

- **Adversarial scenarios** — tasks where a naive prompt produces a generic or wrong answer, and the student must refine until the output meets the bar. Teaches iteration, the skill no static prompt library can.

---

## Domains (proposed for MVP)

Three domains, ~5–7 scenarios each, chosen to serve both the broad ICP and Vertice's Japanese business professionals — and all translate cleanly across EN/JP:

1. **Marketing & Content** — e.g. write a launch email, repurpose a post across platforms, draft ad copy with constraints.
2. **Business Operations** — e.g. summarize a messy meeting note into action items, build an SOP, turn raw data into a decision brief.
3. **Professional Communication** — e.g. a delicate client email, a cross-cultural message, a polite decline with an alternative.

*Open to swapping one (e.g. Sales or Customer Service) — flagged below.*

---

## Scenario Content Model (conceptual)

Each scenario needs, in both EN and JP:

- Title
- Domain + difficulty level
- The brief (situation, goal, intended audience for the output)
- Applicable rubric dimensions (subset of the six)
- Expert prompt
- Expert output (pre-generated)
- Optional: a short "why this works" note revealed after comparison

---

## Personal Library Behavior

- Students save any prompt (theirs or an expert's) to a personal collection.
- Saved prompts are taggable and searchable.
- Library persists across sessions, tied to the student account.

---

## Bilingual Behavior

- All scenario content authored and stored in EN and JP.
- UI follows the student's active locale.
- The evaluator critiques the prompt and returns feedback in the language the student wrote in.
- Expert prompts/outputs stored per-language so comparisons stay native, not translated.

---

## Out of Scope for v1

- Embedding inside Vault lessons (standalone only for now)
- Multi-turn / conversational scenarios (single prompt per attempt at launch)
- Leaderboards or social/competitive features
- Instructor-authored custom scenarios via UI (scenarios are curated/seeded for v1)
- Domains beyond the three above

---

## Open Decisions / Flags

1. **Domain set** — confirm the three proposed (Marketing & Content / Business Operations / Professional Communication), or swap one for Sales or Customer Service.
2. **Adversarial scenarios** — v1 or v2? Recommend v2 unless it's a quick lift, to protect launch scope.
3. **Scoring scale** — per-dimension scale and how the overall score is composed (your codebase Claude can decide the exact math; product just needs "named dimensions + overall + prioritized fixes").
4. **Scenario count** — target 15 for launch (5 per domain) as the sweet spot between "enough to feel like a library" and "authorable in a reasonable window."

---

*HonuVibe.AI — Apply-It Workbench Project Detail | Made with Aloha 🐢*
