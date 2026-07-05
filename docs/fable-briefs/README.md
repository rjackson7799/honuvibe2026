# Fable 5 Brief Pack — how to run it

These are **paste-ready copy briefs for Fable 5**. Each one is self-contained: it carries the exact
current strings, the conversion gaps, the voice rules, and the output format Fable needs. You paste one,
Fable writes copy, you paste the next. Opus/Sonnet handles everything that isn't writing.

Full rationale: `docs/plans/2026-07-04-fable5-monetization-copy.md`.

## The golden rule

**Fable writes prose only.** It does not read the codebase, wire i18n, fix bugs, or verify. That work is
already done (the briefs) or is done afterward by a cheaper model. This is what keeps the expensive,
time-boxed Fable window (through **July 7**) from being wasted.

## Paste order

Run in order — later briefs assume the voice guide from Brief 1 is in your Fable session context.

| # | File | Surface | Locale | Depends on |
|---|------|---------|--------|-----------|
| 1 | `01-voice-guide.md` | Brand voice guide (2 profiles) | EN + JP | — |
| 2 | `02-courses-money-path.md` | Course detail → checkout → confirmation | EN + JP | Brief 1 |
| 3 | `03-vault-membership.md` | Vault sell block + paywall | EN + JP | Brief 1 + Vault bug-fixes |
| 4 | `04-studio.md` | studio.honuvibe.ai (light touch) | EN only | Brief 1 |
| 5 | `05-flagship-course.md` | One course's DB selling copy | EN + JP | Brief 1 + you name the course |

> Brief 3 needs the Vault data-integrity bugs fixed first (price contradiction, mojibake JP, missing i18n
> keys). Those are an Opus/Sonnet task, not a Fable one — done outside this pack.

## The loop (per brief)

1. `/model` → **Fable 5**.
2. If starting a fresh session, paste `01-voice-guide.md`'s **output** (the voice guide) above the brief,
   or keep Brief 1's output in context.
3. Paste the brief. Fable returns copy in the specified output format — and then **stops** (every brief
   ends with a checkpoint gate).
4. `/model` → **Sonnet**. Have it wire the copy into the files / i18n / DB and run `pnpm verify:fast`.
5. **Check spend:** run `/usage` (press `d` for last 24h). Decide whether to continue.
6. Next brief.

## Token guardrails (because nothing auto-alerts)

No model self-monitors token burn in real time, and Claude Code has no native burn-rate alarm. Control it
with:

- **Checkpoint gates** — built into every brief; Fable pauses after each surface instead of running away.
- **`/usage`** between briefs — running session cost (estimated), `d`/`w` toggle.
- **`/usage-credits`** — set a monthly spend cap that prompts before continuing (a backstop, not hourly).
- **Statusline** — enable `context-window-usage` via `/config statusline` for a live context meter.
- **`/model` discipline** — Fable only for the writing turns; Sonnet for wiring and `pnpm verify`.

If you'd rather have a hard token ceiling that *halts* automatically, say so — that path runs the work as
an Opus-orchestrated Workflow with a `budget` cap instead of paste-into-Fable.

## After Fable

- **JP copy is a draft.** Per `CLAUDE.md`, Japanese is never shipped without human review. Have a native
  reviewer (or you) approve before it goes to production.
- **DB copy (Vault tiers, course fields) is applied manually** in the Supabase dashboard SQL editor on
  `zvfwtndbxshrtpwcwynw` after deploy — it is not part of the Vercel build.
- Nothing is "done" until `pnpm verify` is green and both EN + `/ja` are browser-smoked.
