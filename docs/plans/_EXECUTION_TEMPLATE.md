# Page Plan Execution — Sub-Agent Prompt Template

**How to use:** Copy the prompt block below into a fresh Claude chat. Replace `{{PLAN_FILE}}` with the absolute path of the page plan you want executed (e.g. `c:\Users\HCI\Desktop\Projects\HonuVibe_2026\docs\plans\2026-05-19-prelaunch-home-page-polish.md`). Then send.

---

## The prompt

```
You are executing a pre-launch polish plan for the HonuVibe.AI site. The plan
is a complete, approved specification — your job is to implement it faithfully,
verify nothing else broke, commit, and report back.

PLAN FILE:
{{PLAN_FILE}}

---

PROJECT GROUND TRUTH (do not deviate)

- Stack: Next.js 14+ App Router, TypeScript strict, Tailwind v3.4+, next-intl
  for i18n (EN default, JP under /ja/), Supabase, Stripe, Sanity, Beehiiv.
- Package manager: pnpm. NEVER use npm — Vercel deploys break otherwise.
- Git workflow: commit directly to `main` and push. No feature branches. No PRs.
- Bilingual rule: every copy change in messages/en.json MUST have a parallel
  change in messages/ja.json. JP must keep its line-height (1.7–1.8) and
  letter-spacing (0.02–0.04em) — never text-justify JP.
- Theming: dark mode is default, light is secondary. Use CSS variables from
  styles/globals.css, never hardcode colors.
- Copy rule (cross-cutting): marketing-surface copy stays LLM-agnostic
  ("AI" / "AI agents"). Name vendors (Claude, GPT, Gemini) only inside actual
  lesson content where it's functionally relevant.
- Read CLAUDE.md at the repo root before starting. Honor it.

---

WORKFLOW

Phase 1 — Absorb the plan
  - Read {{PLAN_FILE}} fully before touching code.
  - Read CLAUDE.md.
  - Open every file the plan references and read enough surrounding context
    to make the changes safely (imports, neighboring components, parallel JP
    keys).
  - If anything in the plan is ambiguous, contradicts CLAUDE.md, or asks you
    to do something that would break a documented convention, STOP and report
    the conflict instead of guessing.

Phase 2 — Execute the changes
  - Use Edit (not Write) for existing files. Preserve indentation exactly.
  - Make every change in the plan. Do not add changes the plan didn't ask for.
  - When the plan calls for an EN string change, also update the parallel JP
    key. If the plan suggests JP wording, use it; if not, write idiomatic JP
    and flag it in the completion report as a judgment call.
  - Delete unused translation keys cleanly from BOTH messages/en.json and
    messages/ja.json. Don't leave orphans.
  - Don't add comments to explain what you changed — the diff explains itself.
  - Don't write any new files unless the plan explicitly says to.

Phase 3 — Internal testing (the page you changed)
  Run from the project root in PowerShell:

      pnpm dev

  Then in a browser:
  1. Open http://localhost:3000/ + the EN version of the changed page.
     Walk through every item in the plan's "Verification" section. Each
     must pass before you proceed.
  2. Open http://localhost:3000/ja + the JP version of the same page.
     Repeat all checks with JP copy. Inspect JP typography — does the line
     height feel right around the new strings? Any line-breaks landing
     awkwardly?
  3. Check the browser dev console. Zero tolerance for:
       - missing-translation warnings (e.g. "MISSING_MESSAGE: ...")
       - React key warnings
       - hydration mismatches
       - 404s on assets
  4. Resize to mobile width (375px). Layout still intact? Touch targets
     ≥ 44px? No horizontal scroll?
  5. Toggle theme (dark ↔ light). Both themes still readable, no
     hardcoded-color leakage?

Phase 4 — Site-wide regression check (don't break the rest of the site)
  Beyond the page you changed, verify nothing collateral broke:

  1. grep for any translation keys you deleted. Should return zero matches.
       Use the Grep tool, not bash grep.
  2. Click through the site's primary navigation: home, learn, explore,
     partnerships, about, contact, learn/auth. Each loads without console
     errors and renders the right shell (marketing vs learn).
  3. Run a clean production build:

        pnpm build

     Must finish with zero TypeScript errors and zero ESLint errors. If
     warnings appear that weren't there before, list them in the completion
     report.
  4. If the plan touched any auth-adjacent surface (login CTA, dashboard
     link, magic-link copy, account menu): manually run the magic-link
     flow end-to-end (request link → check the email → click → land in
     dashboard). Confirm cookies + redirect still work.

  If ANY check in Phase 3 or Phase 4 fails: STOP. Do not commit. Report the
  failure with the exact error, which step failed, and your hypothesis for
  the cause. Wait for Ryan.

Phase 5 — Plan completion & commit
  Once everything passes:

  1. Open {{PLAN_FILE}} and replace every `- [ ]` in the Verification
     section with `- [x]`. This is the permanent record.
  2. Stage only the files you intentionally changed (don't `git add -A`).
  3. Commit directly to main with the suggested commit message from the
     plan (or write one that follows the same format if none is given).
     Hooks must pass — never use --no-verify.
  4. Push to origin/main.

Phase 6 — Completion report
  Print a final report in EXACTLY this format, no preamble:

  ✅ {PAGE NAME} POLISH — COMPLETE

  Commit: <full SHA>
  Branch: main (pushed)
  Files changed: <N> (<comma-separated list>)
  Build: clean (pnpm build passed)
  Dev: tested at localhost:3000 (EN + JP)

  Verification:
  - [x] <each item from the plan's Verification section>
  - [x] ...

  Site-wide regression:
  - [x] Nav surface unchanged (home/learn/explore/partnerships/about/contact)
  - [x] No orphaned translation keys
  - [x] No new console warnings
  - [x] pnpm build clean
  - [x] (if applicable) Auth flow still works

  Judgment calls made (need Ryan's review):
  - <bullet list of every decision you made without explicit instruction in
    the plan — JP phrasing choices, tag rename targets, spacing tweaks,
    anything>
  - If none: write "None — every change followed the plan verbatim."

  Open questions / follow-ups:
  - <anything that surfaced during execution that Ryan should know before
    the next page — e.g. "Noticed footer also references Claude on line X,
    flagged but not changed since out of plan scope">
  - If none: write "None."

---

THINGS YOU MUST NEVER DO

- Use npm instead of pnpm.
- Create a feature branch or open a PR.
- Use --no-verify or any flag that skips hooks/signing.
- Use --force, reset --hard, or any destructive git command.
- "Improve" code the plan didn't ask you to touch (no drive-by refactors,
  no comment additions, no import sorting).
- Skip the JP parallel of any EN change. Bilingual parity is non-negotiable.
- Mock the dev server or claim tests passed without actually running them.
- Continue past a Phase 3 or Phase 4 failure.
- Add documentation files (*.md, README) unless the plan explicitly says to.
- Commit secrets. If the diff would include .env, credentials, or keys,
  stop and report.

If in doubt about a judgment call: do the conservative thing AND log it in
the completion report. Ryan would rather review a flagged decision than
discover an unflagged one later.
```

---

## Notes for Ryan

- **Verifying completion on your end:** run `git log --oneline -3` after the agent reports done. You should see the new commit on main with the message format the plan suggested. The completion report's "Judgment calls" section is where to focus your review attention — that's where surprises hide.
- **If the agent reports a Phase 3/4 failure:** read the failure detail, decide whether to fix it yourself or send a follow-up prompt clarifying. Don't tell the agent "try again" without giving it new information.
- **Each page gets its own plan file + its own execution session.** Don't reuse a chat across pages — context bleed leads to drift.
