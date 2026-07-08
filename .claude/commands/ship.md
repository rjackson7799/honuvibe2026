---
description: Verify → adversarial review → commit to main → push → report
---

Run the full ship loop for the current working-tree diff. Follow it in order; STOP at the first failing gate and report — do not push broken or unreviewed work.

### 1. Scope
- `git status` + `git diff --stat`. Confirm the changes match what we intended this session. If unrelated/unexpected files appear, ask before continuing.

### 2. Verify (must be green)
- `pnpm verify` (type-check → test:run → build).
- If the diff touches RLS or any `supabase/migrations/*.sql`: also `pnpm test:rls`. Temp-rename the duplicate survey migrations (022/025) before the run and **restore them after** (never commit the rename).
- If the diff touches UI: remind me to do the browser EN + `/ja` smoke (console clean, 375px, both themes) — you can't drive the browser.
- Any failure → STOP, show the exact error + failing step + hypothesis. Do not commit.

### 3. Adversarial review (before commit)
- Dispatch an in-session code-reviewer sub-agent over the diff (the `requesting-code-review` skill). Prompt it to **refute** — find bugs, broken conventions, missing JP parity, regressions — not to approve.
- Triage findings with `receiving-code-review` discipline: verify each against the code. Fix the real ones; for any you reject, state why.
- If you fixed anything, re-run the relevant verify gate (step 2) before proceeding.
- (For a large feature, I may instead run `/code-review ultra` myself — that's user-triggered and billed; you cannot launch it.)

### 4. Ship
- Stage **only intentional files** — never `git add -A`.
- Commit **directly to `main`** and push. No branches, no PRs.
- Hooks must pass — never `--no-verify`; never `--force` / `reset --hard`. Use pnpm, never npm.

### 5. Report
Print: commit SHA, files changed, verify result, review result (N findings / N fixed / N rejected), and judgment calls needing my review.

**If a migration shipped**, end the report with the REQUIRED out-of-band step: apply the `0NN_*.sql` in the Supabase dashboard SQL editor on project `zvfwtndbxshrtpwcwynw` *after* deploy — the Vercel deploy does not run it, and the code 500s ahead of its schema until you do.
