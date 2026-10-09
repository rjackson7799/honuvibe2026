# B1 — Honu Community free (migration 078)

**Status:** BUILT 2026-10-09, committed locally (not pushed) — see "Execution record" at the end. Prereq 1 was waived by Ryan: the auth-hardening work is NOT release-ready (pushing it would 503 email sign-up/sign-in/reset), so B1 shipped on its own and the auth migration was renumbered locally to `084_auth_email_security.sql` (untracked).
**Roadmap:** `docs/plans/2026-10-05-marketing-redesign-green.md` → "### B1" + "Review amendments" (B1 moderation bullet).
**Locked decision #2 (2026-10-04, don't re-litigate):** Honu Community is free for any signed-in user; Vault $99/mo is the only paid tier; the $29 Community price is retired; existing $29 subscribers cancel at period end and get an email (out-of-band).
**Execution:** one fresh session via `docs/plans/_EXECUTION_TEMPLATE.md`, one commit, after the prerequisites below.

---

## Why now

B1 unblocks Unit 1 (Home pricing cards), Unit 2 (Learn pricing strip) and the sign-up copy that 0B deliberately softened ("Start free" / "No card needed to create an account"). After B1 the design's "Join the community for free" wording becomes true.

## Prerequisites (blockers — resolve before the B1 session starts)

1. **Auth-hardening work committed.** `docs/hardening/2026-10-06-auth-implementation-log.md` is still uncommitted and touches `messages/{en,ja}.json`, which B1 also edits. Its migration must be renumbered first: `074_auth_email_security.sql` collides with the prod-applied `074_studio_proposals.sql`. Use **084+** (078–083 are reserved by the redesign roadmap; B1 takes 078).
2. ~~`app/api/stripe/subscribe/route.ts` uncommitted `createAdminClient` change~~ — **done, 6bbdf55.** (The `checkout` / `checkout-embed` edits are a different change — they read the `course_catalog` view from untracked migration 071 — and stay uncommitted with the course-access workstream; B1 doesn't touch them.)
3. ~~Next 16.3.4 bump~~ — **done, 7231921.** Local Windows builds need `node-linker=hoisted` regardless of Next version (strict pnpm layout breaks Turbopack's next/font resolution here).
4. Record the baseline SHA in the execution session's first message.

## Decisions (Ryan, 2026-10-07: all four accepted as recommended)

| # | Question | Decision |
|---|---|---|
| D1 | **Vertice partner landing** (`components/partners/vertice/VerticeLanding.tsx:2192`) still sells a `$29/month` Community `PriceCard` through `/api/stripe/partner-checkout` (`tier: 'community'`). Keep, remove, or relabel? | **Remove the Community card** and keep Vault + cohort. Vertice members get Community via membership anyway. Partner-checkout keeps *accepting* `community` for in-flight sessions (fulfill.ts unchanged) but the route rejects **new** `community` checkouts. |
| D2 | **Posting throttle.** Today `community_posts` / `community_comments` inserts go straight through RLS with no rate limit (`lib/community/rate-limit` only guards link-preview + reports). Opening Community to every account widens the spam surface. | **Add a DB-level throttle in 078**: a `BEFORE INSERT` trigger limiting each author to 10 posts/hour and 60 comments/hour (admins/partner moderators exempt), raising a typed error the composer turns into translated copy. |
| D3 | **Email confirmation before posting.** A session (`auth.uid()`) already requires a confirmed email for password sign-ups, and Google accounts are confirmed by the provider. | **No extra gate in B1** — rely on the session requirement; the auth-hardening work owns signup confirmation. Add an RLS test proving an unconfirmed/no-session client cannot post. |
| D4 | **Legacy $29 subscribers** after B1: they already have Community for free, so what does billing show? | Billing shows "Honu Community (legacy plan) — ends {date}" for `subscription_tier='community'` rows with an active sub, plus the Vault upgrade. No forced cancellation from code (Stripe step is out-of-band). |

## Scope

### 1. Migration `supabase/migrations/078_community_free.sql`

- `CREATE OR REPLACE FUNCTION public.has_community_access(p_user_id uuid)` — **same signature, same `SECURITY DEFINER STABLE`, same `SET search_path = pg_catalog, public`**:

  ```sql
  SELECT p_user_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = p_user_id);
  ```

  Every 042 policy (`cp_*`, `cc_*`, likes, reports) and `community_scope_for()` are unchanged and inherit it. Partner members still land in their partner scope; everyone else in the main feed.
- Keep `COMMENT ON FUNCTION` updated (cite decision #2).
- **Do not** tighten `users_subscription_tier_check` (036): `'community'` rows stay valid.
- Re-assert grants after `CREATE OR REPLACE` (it keeps them, but the 076 incident says verify): `REVOKE ALL ... FROM PUBLIC`, `GRANT EXECUTE ... TO authenticated, anon` matching the current grants — look them up from prod (`\df+` / `pg_proc.proacl`) before writing, don't guess.
- If D2 = yes: `community_insert_throttle()` trigger function (`SECURITY DEFINER`, empty/pinned `search_path`) + `BEFORE INSERT` triggers on `community_posts` and `community_comments`, counting the author's rows in the last hour; exempt `is_admin()` / `is_partner_for(partner_id)`. Raise with a distinct SQLSTATE/message (`community_rate_limited`).
- `NOTIFY pgrst, 'reload schema';`
- Header comment: apply to prod **before** pushing the code (expand-first is safe: the function only widens access, and the new code still works against the old function).

### 2. App-side access mirror

- `lib/access/checks.ts` `hasCommunityAccess(user, enrollments?, hasActiveMembership?, now?)`: keep the signature; return `true` for any user object (signed-in). Update the doc comment's "stacked ladder" (Community = any account). Leave `hasVaultAccess` untouched.
- `lib/access/parity-matrix.ts`: `expectCommunity: true` on every case (incl. `free_nothing`, removed-membership, expired-sub cases). Update the file comment.
- `__tests__/lib/access/checks.test.ts` and `supabase/tests/partner_entitlement_parity.test.ts` walk the matrix — no new cases needed beyond the flips, but add one explicit "free account, nothing else → community true, vault false" assertion to the TS suite as the headline test.

### 3. Stripe — Vault is the only checkout tier

- `lib/stripe/tiers.ts`: split "checkout-eligible" from "resolvable".
  - `CHECKOUT_TIERS = ['vault'] as const`.
  - Keep `community` in `TIER_REGISTRY` / `resolveSubscriptionTier` / `paymentTypeForRenewal` so renewal, cancellation and `invoice.paid` events for legacy $29 subs still resolve (comment: "legacy — until the last $29 sub ends; see out-of-band step").
- `lib/stripe/subscribe-helpers.ts` `parseTier`: only `'vault'`.
- `app/api/stripe/subscribe/route.ts`:
  - **GET** `tier=community` (old emails, bookmarks, cached pages — a browser navigation) → **302** to the localized `/learn/dashboard/community` (Community is free now; signed-out visitors bounce through `/signin?redirect=…` via the existing guard). No Stripe call.
  - **POST** `tier=community` → **400** `{ error: 'tier_retired' }`.
  - Missing tier on POST → default `vault` (fixes `PremiumUpgradeCard`, which POSTs no tier today and gets a 400).
- `app/api/stripe/partner-checkout/route.ts`: zod `tier` enum drops `community` for **new** sessions (per D1). `lib/partner-checkout/fulfill.ts` unchanged (still fulfils in-flight `community` sessions).
- Webhooks (`lib/stripe/webhooks.ts`): unchanged.

### 4. UI and copy

- `components/community/CommunityPaywall.tsx`: the dashboard route is auth-guarded, so a signed-in user can no longer hit it. Replace the two tier cards with a defensive fallback ("Your profile is still being set up — refresh, or contact us") + link to `/learn`; drop the `tier=community` link and the `community_tier` analytics CTA. (It only renders now if the `users` row is missing.)
- `components/marketing/learn/learn-chapter-vault.tsx` (legacy Learn page until Unit 2): Community card → **Free**, CTA "Join free" → `/signup`; Vault card unchanged.
- `components/learn/PremiumUpgradeCard.tsx`: POST `{ tier: 'vault' }`; price copy from the Vault price (`$99/month`), not `subscription.price_monthly` ($29). Check `price_monthly_jpy` (¥3,980) — JPY copy must match a real Stripe price or be removed (USD-only per `tiers.ts`).
- `components/billing/SubscribeButton.tsx`: drop the `community` label path (tier prop type → `'vault'`).
- Billing (`VaultStatusCard` / billing page): legacy-plan line per D4.
- `components/partners/vertice/VerticeLanding.tsx`: per D1. (Vertice is JP-only post-approval — don't add EN copy there.)
- Sign-up copy (0B ruling): restore the design wording — `auth.signup_eyebrow` "Join the community", `auth.signup_body` "Join the community for free. Upgrade to the full course library whenever you're ready.", `auth.signup_form_note` "No card needed to join the community." (+ JA). **Coordinate with the auth-hardening commit**, which also rewrote auth copy — edit its final keys, don't reintroduce removed ones.

### 5. i18n (EN + JA, every key paired)

- `learn.chapter_vault.community.*`: price "Free", price_unit "", price_note "Free with any account", cta "Join free".
- `subscription.price_monthly` → Vault `$99/month`; `price_monthly_jpy` per §4 decision.
- `community.paywall_*`: fallback copy; remove `paywall_inline.community_bullets` only if grep shows no other consumer.
- `billing.subscribe_community`: remove if unused after §4; add `billing.legacy_community_plan` (D4).
- New `community.rate_limited` (D2).
- JA is machine-drafted → flag for native review.

## Tests

| File | Change |
|---|---|
| `__tests__/lib/access/checks.test.ts` | Matrix flips + headline free-account case |
| `supabase/tests/partner_entitlement_parity.test.ts` | Runs the flipped matrix against SQL (`pnpm test:rls`) |
| `supabase/tests/community_rls.test.ts` + `helpers/fixtures.ts` | `honuvibe_free` **can** read + post in the main feed (today's test asserts the opposite — rewrite it); anon reads/posts nothing; partner-scoped member still cannot post to main feed; banned user still blocked; D2 throttle: 11th post in an hour fails, admin exempt |
| `supabase/tests/partner_membership_rls.test.ts` | Re-check any assertion that relied on community being paid (line ~111 `granted_tier: 'community'`) |
| `__tests__/api/stripe-subscribe-get.test.ts` | GET `tier=community` → 302 to `/learn/dashboard/community` (and `/ja/…`), no Stripe call; POST `tier=community` → 400; missing tier on POST → vault; vault paths unchanged |
| `__tests__/lib/stripe-webhooks-subscription.test.ts` | Add: a `STRIPE_COMMUNITY_PRICE_USD` renewal still resolves to `community` (legacy) |
| `__tests__/marketing/learn/learn-sections.test.tsx` | `$29` → Free; CTA href `/signup` (lines ~133, ~152) |
| New `__tests__/components/community/community-paywall.test.tsx` | Fallback renders, no checkout link |
| Partner-checkout route test (if one exists; else add) | New `tier: 'community'` rejected |

## Verification

- `pnpm type-check`, `pnpm exec vitest run --project app --maxWorkers=2` (known red: 28 in `lib/progress/*` unless fixed by then), `pnpm build` (`NODE_OPTIONS=--max-old-space-size=8192`).
- `pnpm test:rls` against the **hosted throwaway project** `kmmfssluqbcuhybfrsbn` (not prod; Email auth must stay ON there) with 078 applied there first.
- Browser smoke (headless Playwright is the reliable path — the Chrome extension could not attach on 2026-10-07): as a fresh free account, `/learn/dashboard/community` shows the feed and posting works; EN + `/ja`; billing page for a free user and (fixture) a legacy community subscriber; `/api/stripe/subscribe?tier=community` → lands on the free Community feed; legacy Learn page shows Free.
- Adversarial review (`requesting-code-review`) before commit; triage with `receiving-code-review`.

## Ship sequence

1. Commit B1 locally (do **not** push).
2. Ryan applies `078_community_free.sql` in the Supabase dashboard SQL editor on `zvfwtndbxshrtpwcwynw`; verify by **querying prod** (`select pg_get_functiondef('public.has_community_access(uuid)'::regprocedure);` + grants + trigger list), never by trusting a note.
3. Push.
4. Out-of-band (Ryan, Stripe): count active $29 Community subs → set each to cancel at period end → archive the Community price → keep `STRIPE_COMMUNITY_PRICE_USD` in Vercel until the last one ends → send the notice email.

## Rollback

The function change is additive (widens access). Rolling back = re-run the 064 body of `has_community_access` from `064_partner_membership_spine.sql:1785-1821`. Code rollback alone is safe while 078 stays applied (old code + free community = paid UI shown to users who already have access — cosmetic). Drop the D2 triggers separately if they misfire.

## Out of scope

Pricing-card redesign (Units 1 and 2), Vault course inclusion (B3), track columns (B2), community feature changes, Stripe data changes from code, a second Beehiiv publication.

---

## Execution record (2026-10-09)

**Baseline:** `7231921`. Verified in a clean worktree of HEAD + exactly the B1 diff (hoisted install), because the main working tree carries unrelated uncommitted work (auth hardening, course_catalog, etc.). `messages/{en,ja}.json` and `__tests__/lib/stripe-webhooks-subscription.test.ts` were already dirty with auth-hardening changes, so B1's edits were applied to their HEAD versions by script and only those were staged.

**Deviations from the plan (judgment calls):**
- **Grants not re-asserted.** `has_community_access` has never had explicit grants (042/064 rely on defaults) and its RLS policies run it as the caller's role, anon included. `CREATE OR REPLACE` keeps the ACL, so 078 leaves it alone; prod could not be queried from the session (Supabase MCP unauthenticated). The verification queries are at the bottom of 078.
- **Throttle SQLSTATE `PT429`** (PostgREST maps `PTxyz` → HTTP xyz) rather than an arbitrary class; review flagged the first choice, `HV429`, as the FDW error class.
- **D4 upgrade path.** The webhook tracks one subscription per user (a second sub is refused; the old sub's `deleted` event resets the user to `free`), so a legacy $29 subscriber must NOT start a Vault checkout. Billing hides Subscribe for them and shows the legacy line + Manage Subscription + "contact us to switch sooner". "Ends {date}" shows only once the sub is set to cancel; before that it says "Renews {date}".
- **POST missing tier** already defaulted to `vault` before B1, so no change was needed there. `PremiumUpgradeCard` now follows `upgrade_url` instead of failing silently for existing subscribers.
- **JPY** `price_monthly_jpy` (¥3,980) removed: no JPY Stripe price exists (`tiers.ts` is USD-only).
- `partner_membership_rls.test.ts:111` needed no change (it's the seat-block CHECK, not community access).
- **D3 test** pins the GoTrue precondition (an unconfirmed account gets no session); the no-session post is covered separately. There is no DB-level gate for D3, by decision.

**Not run:** `pnpm test:rls`. The throwaway project `kmmfssluqbcuhybfrsbn` no longer resolves in DNS (likely paused). Restore it, apply 078 there, run `pnpm test:rls` — **before** applying 078 to prod.
