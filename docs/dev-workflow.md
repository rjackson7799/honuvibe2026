# Development Workflow — How We Run Plans Here

This is the operating model for building on HonuVibe.AI. It exists to replace
"single-entry prompting" (one long thread, manual external review) with a repeatable,
in-session loop:

> **Plan → Execute → Review → Verify → Ship**

The planning step is already strong (see `docs/plans/`). The two upgrades this document
codifies are an **adversarial review step** done in-session, and a **scripted verify
gate** using the real `package.json` scripts. Both used to happen by hand and out-of-band.

---

## The loop

### 1. Plan
- One plan per unit of work: `docs/plans/<YYYY-MM-DD>-<slug>.md`.
- Keep the existing shape: **Context**, **Locked decisions**, **Reusable pieces
  (verified)** with `file:line` refs, phased implementation, **Out of scope / risks**,
  **Out-of-band steps**.
- Pause for Ryan's explicit review of the plan before a full build — even after the
  plan looks done.

### 2. Execute
- Run each plan in a **fresh session** using `docs/plans/_EXECUTION_TEMPLATE.md`. A clean
  context per plan prevents drift; don't reuse one chat across multiple plans.
- **Parallelism, honestly:** most plans (a page polish, one feature surface) are a single
  unit — run them in one session. Split work across parallel sub-agents only when phases
  are genuinely **independent** (different files, no shared state). Large multi-system
  builds (e.g. survey generalization) are mostly **sequential** — schema → actions →
  builder → form → summary — so parallelism buys little there. Don't fan out for its own
  sake.

### 3. Review — *the new step* (before commit)
This is the in-house replacement for relaying the diff to a 3rd-party reviewer.

- **Routine work:** dispatch an in-session code-reviewer sub-agent over the diff using the
  `requesting-code-review` skill. Prompt it to **refute**, not rubber-stamp — its job is
  to find what's wrong, not to approve.
- **Large feature / pre-merge:** run `/code-review` (deeper), or `/code-review ultra` for
  the multi-agent cloud review of the whole branch. These are **user-triggered and
  billed** — Claude cannot launch them programmatically; Ryan runs them.
- **Process findings with discipline** (`receiving-code-review`): verify each finding
  against the code before acting. Apply the real ones; push back on the wrong ones with a
  reason. Never blindly apply review feedback.

### 4. Verify — scripted gate (no "looks done")
Use the real scripts in `package.json`. Don't claim done without the relevant gate green.

| Situation | Command | Notes |
|-----------|---------|-------|
| Default gate before commit | `pnpm verify` | type-check → `test:run` → build |
| Fast inner loop | `pnpm verify:fast` | type-check → tests only (no build) |
| Touched RLS or a migration | `pnpm test:rls` | **see caveat below** |
| UI change | browser EN + `/ja` smoke | console clean, mobile 375px, theme toggle |

- **`test:rls` caveat:** the local RLS suite fails on the duplicate survey migration
  versions (022/025). Temp-rename those migration files before `pnpm test:rls`, then
  restore them. (Project memory: `supabase-duplicate-migrations`.)
- **UI smoke** = keep the template's Phase 3/4 checks: open the changed page at
  `localhost:3000` and `/ja`, zero console warnings (no `MISSING_MESSAGE`, no hydration /
  key warnings, no asset 404s), layout holds at 375px, both themes readable.

### 5. Ship
- Stage **only intentional files** (never `git add -A`).
- Commit **directly to `main`** and push. No feature branches, no PRs.
- Hooks must pass — never `--no-verify`, never `--force` / `reset --hard`.
  (Project memory: `git-workflow`.)
- Use **pnpm** for everything — never npm, or Vercel deploys break.
  (Project memory: `package-manager`.)

### Out-of-band gate — production migrations are manual
If the plan includes a migration, prod is **not** updated by the Vercel deploy. After
deploying, apply the `0NN_*.sql` file in the Supabase dashboard SQL editor on project
`zvfwtndbxshrtpwcwynw`, or the code 500s ahead of its schema. Surface this in the
completion report whenever a migration shipped. (Project memory:
`supabase-migrations-manual-prod`.)

---

## One-keystroke commands

- **`/verify`** — runs the scripted gauntlet for the current diff (adds `test:rls` when
  migrations/RLS are touched; prompts the browser smoke for UI). No commit.
- **`/ship`** — the full tail of the loop: verify → adversarial review → fold confirmed
  findings → stage intentional files → commit to `main` → push → report.

---

## When to escalate to a Workflow
Multi-agent Workflows earn their cost on **broad audits, multi-file migrations, and
exhaustive reviews** — work too large for one context. For a single-file fix or one
feature surface, a plan + one executor is the right tool. Don't orchestrate where you
don't need to.

## Skills this loop leans on
`requesting-code-review`, `receiving-code-review`, `verification-before-completion` (the
review/verify spine), and `executing-plans` / `subagent-driven-development` (the execute
step).
