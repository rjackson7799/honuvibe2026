---
description: Run the scripted verify gate on the current diff (no commit)
---

Run the HonuVibe verify gate against the current working-tree diff. Do **not** commit.

1. Look at what changed: `git status` + `git diff --stat`.
2. Run the default gate from the project root:
   - `pnpm verify` (type-check → test:run → build). Use `pnpm verify:fast` only if I asked for a quick inner-loop check.
3. **If the diff touches RLS policies or any `supabase/migrations/*.sql`**, also run `pnpm test:rls`.
   - Caveat: the local RLS suite fails on the duplicate survey migration versions (022/025). Temp-rename those two files before the run, then **restore them afterward** — never leave them renamed and never commit the rename.
4. **If the diff touches UI** (components, pages, styles, `messages/*.json`), remind me to do the browser smoke: open the changed page at `localhost:3000` and `/ja`, confirm zero console warnings (no `MISSING_MESSAGE`, hydration, or key warnings), layout holds at 375px, both themes readable. (You can't drive the browser — just flag what to check.)

Report a concise pass/fail summary. On any failure: STOP, show the exact error and the failing step, and give your hypothesis for the cause. Do not attempt to commit.

Use **pnpm** only — never npm.
