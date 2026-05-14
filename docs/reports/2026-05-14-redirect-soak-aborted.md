# Redirect Soak Promotion — Aborted (2026-05-14)

## Trigger

The scheduled agent could not locate the soak-start commit `efee820` in the
repository's git history. The cutover commit `f8d7d0c` is also absent. The
repository contains exactly 50 commits; neither SHA appears among them.

Because the stability check is defined as `git log --oneline efee820..HEAD`
(scan for red-flag subjects since the soak window opened), and that range
cannot be resolved, the required health signal is unavailable. Per the agent's
abort-on-uncertainty rule, no edits were made to `next.config.ts`.

## Current state

`next.config.ts` still carries the 12 marketing-rebuild redirects at
`permanent: false` (307 Temporary) with the soak-window NOTE comment intact.
The alias-chain redirects below them remain at `permanent: true` (308) and
are unaffected.

## Recommendation

**Keep all 12 redirects at `permanent: false` (307) indefinitely until Ryan
manually reviews.**

Possible explanations for the missing commits:
- The working tree was re-cloned from a shallow source after `efee820` was
  authored, so the earlier history was not fetched.
- The branch was rebased or force-pushed after the soak window opened,
  rewriting those SHAs.
- The task description references a different repository or remote than the
  one currently checked out.

Before promoting to 308, Ryan should:
1. Confirm `efee820` and `f8d7d0c` are reachable on `origin/main`
   (`git fetch origin && git cat-file -t efee820`).
2. Run `git log --oneline efee820..HEAD` and verify no red-flag commits
   (subjects containing `revert`, `rollback`, `hotfix`, `emergency`,
   `disable redirects`, or references to `legacy-dark-design` being promoted).
3. If the log is clean, manually flip `permanent: false` → `permanent: true`
   on the 12 marketing-rebuild entries and remove the soak NOTE comment block
   (lines 15–19 of `next.config.ts` as of this writing).

The legacy fallback remains available at branch `legacy-dark-design` /
tag `legacy-dark-design-prod` at `08736f5` (per task spec — verify on origin).

## TODO — Ryan

- [ ] Resolve missing soak-start commit `efee820` (fetch, rebase audit, or
      confirm history was rewritten).
- [ ] Re-run redirect promotion once commit lineage is verified clean.
- [ ] If history was intentionally rewritten and the soak window is confirmed
      clean by other means (Vercel analytics, zero incident reports), promote
      manually as described above.
