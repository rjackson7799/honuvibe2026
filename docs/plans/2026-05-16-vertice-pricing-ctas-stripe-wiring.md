# Vertice Society Pricing CTAs — Live Stripe Checkout

**Date:** 2026-05-16
**Owner:** Ryan
**Status:** Plan (pre-implementation)

---

## Context

The three pricing card CTAs on `/ja/partners/vertice-society` (Community / Vault / Cohort) currently route to `/partners/vertice-society/coming-soon`, a route that does not exist — every click 404s. Hero, mid-page, and mobile-sticky CTAs all jump to `#pricing`, so the dead end is isolated to the three `PriceCard` buttons in [VerticeLanding.tsx:2398-2405](components/partners/vertice/VerticeLanding.tsx#L2398-L2405).

Goal: replace the placeholder href with real Stripe Checkout flows for the three tiers so users can actually buy. This is the conversion bottleneck — the entire landing page funnels into these buttons.

The repo already has a mature Stripe stack (client, 6-event webhook router, course checkout, vault subscription, billing portal, partner attribution via `hv_partner` cookie). We extend it; we don't rebuild it.

---

## Revision 4 — 2026-05-17 (USD-only)

Ryan decided to charge USD only across all three tiers to avoid exchange-rate variance. All `_JPY` env vars and locale→currency branching are removed. The Japanese-localized landing continues to display JP copy, but prices are shown in USD with a "billed in USD" disclaimer.

**Test-mode prices created (USD only):**
- `STRIPE_VAULT_PRICE_USD = price_1TYJmmKnFgO2lCd9XvBZEo8y` ($49/mo, no trial)
- `STRIPE_COMMUNITY_PRICE_USD = price_1TYJr8KnFgO2lCd96IDP38WH` ($29/mo, 14-day trial)
- `STRIPE_COHORT_MAY2026_PRICE_USD = price_1TYJwhKnFgO2lCd9mSSoLeju` ($1,250 one-time)

## Revision 3 — 2026-05-17 (post-review hardening)

External review surfaced ten Stripe/data correctness issues. All are integrated below. Headlines:
- Stripe prices are **immutable** — we create new Vault prices, don't "update" the old ones. Old price IDs stay in the tier map so legacy subscriptions keep resolving.
- Webhook handlers do **not assume event order** — every branch is independently capable of finding/creating the user.
- Partner-checkout branch moves **before** the existing `user_id/course_id` guard in `handleCheckoutCompleted`.
- `customer_creation: 'always'` is only valid in `payment`/`setup` modes — removed from subscription sessions.
- `'premium'` → `'vault'` migration is bigger than one CHECK constraint; full file-by-file audit included.
- Access checks include explicit **cancelled-grace** until `subscription_expires_at`.
- **Guest-checkout duplicate-subscription** policy: look up existing Stripe Customer by email server-side before session creation; pass `customer:` if found.
- **Magic-link** uses `session_id` validated against Stripe, not raw email.
- **Landing copy alignment** is in-scope for this release (minimum: prices match what Stripe charges).
- **Test vs live** environments fully separated; no key-swapping.

## Revision 2 — 2026-05-17 (supersedes earlier sections)

Pricing model rethought. The earlier one-time $199 "founding member" Vault was retired in favor of pure-subscription with stacked-ladder bundling. All sections below this header reflect the current plan; the original Stripe products / DB / architecture sections that follow this block have been rewritten in place.

**One Vault, one product.** The Vertice landing's "Vault" tier is the same Stripe product as the existing HonuVibe Vault subscription. No `STRIPE_VERTICE_VAULT_*` env vars; reuse `STRIPE_VAULT_PRICE_USD/JPY`. The new `/api/stripe/partner-checkout` route looks up that same price ID and creates a guest-checkout subscription session. The existing `/api/stripe/subscribe` route (auth-required, used by `/learn/dashboard/billing`) is left untouched for now.

**Stacked ladder.** Community ($29/mo) → Vault ($49/mo, includes Community) → Cohort ($1,250 one-time, includes Vault + Community for cohort duration + 90 days).

---

## Decisions (locked)

1. **Guest checkout** — collect email at Stripe Checkout; webhook creates/links the HonuVibe account on success. No login wall on the landing. *(Round 1)*
2. **Vault model** — pure monthly subscription, **$49/mo USD**. No one-time, no lifetime, no 3-month intro. Reuses the existing HonuVibe Vault product. *(Round 2)*
3. **Community model** — monthly subscription, **$29/mo USD**, with **14-day free trial** (Stripe `trial_period_days: 14`, card collected at signup). *(Round 2)*
4. **Cohort model** — one-time payment, **$1,250 USD**, à la carte per cohort. Each cohort gets its own Stripe product/price. *(Round 1 + 2)*
5. **Stacked ladder** — Vault grants Community access transparently. Cohort grants Vault + Community access for `cohort_end_date + 90 days`. *(Round 2)*
6. **Cohort capacity** — no API enforcement; manual. *(Round 1)*
7. **Stripe products** — Ryan creates in Dashboard; plan documents exactly what to create. *(Round 1)*
8. **Community fulfillment** — uses the existing `users.subscription_*` columns with an expanded `subscription_tier` enum (`'free' | 'community' | 'vault'`). No new boolean flag. *(Round 2 — supersedes Round 1's `community_member` boolean)*

### USD-only pricing

| Tier | Price | Mode |
|---|---|---|
| Community | $29/mo | Subscription with 14-day trial |
| Vault | $49/mo | Subscription, no trial |
| Cohort (May 2026) | $1,250 | One-time |

JP-localized landing displays the same USD prices with a "billed in USD · 米ドル建て請求" disclaimer near the pricing cards. No FX conversion in the app; Stripe handles the customer's card-issuer FX automatically.

### Landing copy alignment — in scope (consumer-protection issue)

The current `VerticeLanding.tsx` shows Community at ¥2,800/mo, Vault at $199 one-time, "37 of 100 founding seats left." Once the CTAs charge live Stripe prices, the displayed prices MUST match what users are actually charged — this is a refund/trust risk, not a polish item.

**Minimum copy changes in this release** (same commit as wiring the CTAs):
- Community card: **$29/mo** (USD only). Remove ¥2,800/mo line. Add "14-day free trial" line.
- Vault card: **$49/mo** (USD only). Remove "$199 one-time," "Founding Member" badge, "37 of 100 remaining," and the ¥29,800 line.
- Vault card: bullet "1 month Honu Community membership free" → **"Honu Community included"** (bundled, not trial).
- Cohort card: **$1,250** (USD only). Remove ¥187,500 line.
- Add a single "billed in USD · 米ドル建て請求" disclaimer below the pricing cards (visible in both EN and JP).
- Hero CTAs (`Get Vault Access`) — copy stays as-is; they jump to `#pricing` so the price disclosure happens there.

**Out of scope for this release** (separate copy polish later):
- Full re-pitch of the value props per tier.
- New "Founders" cohort messaging if you want to position the May 2026 cohort that way.
- Updated cohort start date if it slips.

---

## Stripe products to create (in Stripe Dashboard)

Create **in test mode first**, then mirror in **live mode** at deploy time. **Never swap keys in `.env.local`** — `.env.local` and Preview use test keys, Production uses live keys (see *Environment matrix* below).

**Important**: Stripe prices are immutable. To change a price amount, you create a **new price** on the same product, then archive the old one. Old price IDs must remain readable for as long as any subscription references them.

### What to create (USD only)

| Product | Action | Mode | USD price | Env var |
|---|---|---|---|---|
| HonuVibe Vault | **Create new price on existing product** (archive old after migration) | Subscription, monthly, no trial | $49.00 | `STRIPE_VAULT_PRICE_USD` *(replaces old value)* |
| HonuVibe Community | **Create product + price** | Subscription, monthly, **14-day trial** | $29.00 | `STRIPE_COMMUNITY_PRICE_USD` |
| Vertice Cohort — May 2026 | **Create product + price** | One-time | $1,250.00 | `STRIPE_COHORT_MAY2026_PRICE_USD` |

### Vault price migration — handling existing subscribers

The current Vault prices (`price_1T6pF0KnFgO2lCd9JpL1Dfvs` / `price_1T6pIMKnFgO2lCd9edvw00Zr`) are live. There may be existing subscribers paying at whatever the current amount is.

**Steps:**
1. Create new $49/¥6,900 prices on the **same Vault product** in Stripe.
2. Update the env vars to point at the new price IDs.
3. **Add the old price IDs to `lib/stripe/tiers.ts` `LEGACY_VAULT_PRICE_IDS`** so the webhook can still resolve `subscription.items.data[0].price.id → tier 'vault'` for existing subscribers when their `customer.subscription.updated` events fire.
4. Leave old prices **active** (not archived) until you decide on migration: either (a) grandfather existing subscribers at old price forever, or (b) issue a Stripe `subscriptions.update` to move them to the new price at next renewal. Decision is out of scope for this commit; the legacy IDs in the registry make either path safe.
5. Archive old prices in Stripe Dashboard **only after** all known subscribers are migrated.

### Stripe Dashboard checklist

- **Community subscription**: set `trial_period_days: 14` on the price (and set per-checkout in code as belt-and-suspenders).
- **Product metadata**: `tier = community | vault | cohort` on the **product** (Stripe lets you set metadata on both product and price; product-level travels with all prices). Cohort product also: `cohort_id = may2026`, `cohort_start = 2026-05-23`, `cohort_end = 2026-06-27`. These are documentation; code uses the registry.
- **Product names matter** — they appear on Stripe receipts. Use customer-facing names ("HonuVibe Vault — Monthly", not "vault_v2_test").
- **Currency**: USD amounts in **cents**. JPY is **zero-decimal** — enter yen directly.
- **Billing address collection**: enable on Checkout Session for JCT compliance (see *Tax & compliance*).

### Naming future cohorts

Each cohort = its own Stripe product (e.g., `Vertice Cohort — Aug 2026`) with its own env var (`STRIPE_COHORT_AUG2026_PRICE_*`). Cycling cohorts = add a Stripe product, add an env var, add a line to `COHORT_REGISTRY`.

### Env vars to add (test + live)

```
# Test mode (set in .env.local + Vercel Preview env)
STRIPE_VAULT_PRICE_USD=price_1TYJmmKnFgO2lCd9XvBZEo8y
STRIPE_COMMUNITY_PRICE_USD=price_1TYJr8KnFgO2lCd96IDP38WH
STRIPE_COHORT_MAY2026_PRICE_USD=price_1TYJwhKnFgO2lCd9mSSoLeju

# Live mode (set in Vercel Production env only, when ready to launch)
# Same names, different price IDs from live-mode dashboard
```

JP-locale customers see the same USD prices. No `_JPY` variants.

---

## Tax & compliance

Decisions for this release (revisit at higher revenue):

- **Stripe Tax**: **enable automatic tax** on all three new prices. Stripe handles JCT (Japan Consumption Tax, currently 10%) and US sales-tax registration thresholds. Pricing displayed on the landing is **exclusive of tax** — Stripe adds it at checkout based on the customer's billing address.
- **Billing address collection**: set `billing_address_collection: 'required'` on every Checkout Session. JCT requires it for B2C invoices.
- **Tax behavior on prices**: set each price's `tax_behavior` to `'exclusive'` in the Stripe Dashboard. Match this in the displayed landing copy ("plus tax" / "税別").
- **Receipts**: Stripe sends them automatically when a customer email is present. We don't build a custom receipt template for MVP.
- **APPI**: the landing already collects email under existing privacy policy. No new data classes — same compliance posture as the existing newsletter flow.

---

## Architecture

One new API route handles all three tiers, branched by `tier` param. Webhook router gets two new branches (one for subscriptions, one for cohort one-time).

### Access model

Single source of truth on `users` for subscription access; separate table for cohort access (which is time-boxed and not a subscription).

**Subscription access (Community + Vault)** — reuse existing columns, expand the enum:

- `users.subscription_tier` — widen CHECK from `('free', 'premium')` to `('free', 'community', 'vault')`. **Data migration**: any existing user with `subscription_tier = 'premium'` is migrated to `'vault'`. See *Premium → Vault migration* below.
- `users.subscription_status` — already supports `'active' | 'trialing' | 'cancelled' | 'past_due' | 'none'`. No change.
- `users.subscription_expires_at` — already exists. Stripe webhook keeps it current.
- `users.subscription_stripe_id` — already exists. One subscription per user (see *Duplicate subscription policy* below for how we enforce this with guest checkout).

**Stacked access — with explicit cancelled-grace** (in `lib/access/checks.ts`):

```ts
// User retains access through the paid period even after cancellation.
function hasActiveSubscription(user): boolean {
  const status = user.subscription_status;
  if (status === 'active' || status === 'trialing') return true;
  if (status === 'cancelled' && user.subscription_expires_at) {
    return new Date(user.subscription_expires_at) > new Date();
  }
  return false;
}

function hasCommunityAccess(user): boolean {
  return (
    (hasActiveSubscription(user) && ['community', 'vault'].includes(user.subscription_tier))
    || hasActiveCohortAccess(user)
  );
}

function hasVaultAccess(user): boolean {
  return (
    (hasActiveSubscription(user) && user.subscription_tier === 'vault')
    || hasActiveCohortAccess(user)
  );
}
```

Parentheses are explicit — boolean precedence bugs are a class of subtle failure we don't want here.

`'past_due'` status: access is currently retained (Stripe retries the card; we don't pre-emptively cut). Revisit if dunning becomes a real problem.

**Cohort access** — new `cohort_enrollments` table:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid fk references users(id) | |
| `cohort_id` | text not null | e.g. `'may2026'` — matches Stripe product metadata + `COHORT_REGISTRY` key |
| `stripe_session_id` | text unique not null | idempotency |
| `stripe_payment_intent_id` | text | for refund correlation |
| `amount_paid` | int not null | cents (USD) or yen (JPY zero-decimal) |
| `currency` | text not null | |
| `partner_slug` | text nullable | attribution from `hv_partner` cookie |
| `bundle_access_starts_at` | timestamptz not null | cohort start |
| `bundle_access_ends_at` | timestamptz not null | `cohort_end + 90 days` |
| `created_at` | timestamptz default now() | |

Constraints:
- `unique(user_id, cohort_id)` — no duplicate purchases of the same cohort.
- RLS: users read own rows; service role writes (webhook only).

`hasActiveCohortAccess(user)` = `now() between bundle_access_starts_at and bundle_access_ends_at` for any of the user's cohort enrollments.

**Cohort purchases also insert a `payments` row** — same as subscription renewals do today. Keeps `/learn/dashboard/billing` payment history complete. Use `payments.type = 'cohort_purchase'`. The `payments.type` CHECK constraint may need widening — check current values in `supabase/migrations/` and add a migration if needed.

### Premium → Vault migration (existing code + data)

`'premium'` is used in TWO different vocabularies in this codebase:

1. **`users.subscription_tier`** (subscription level) — **migrates** to `'vault'`.
2. **`vault_content.access_tier` and `library_videos.access_tier`** (content rating) — **stays** as `'free' | 'premium'`. Content vocabulary, not subscription level. Gating logic maps `subscription_tier === 'vault'` → "can view content where `access_tier === 'premium'`".

**Data migration** (in the same migration file as the CHECK constraint change):

```sql
update users set subscription_tier = 'vault' where subscription_tier = 'premium';
alter table users drop constraint users_subscription_tier_check;
alter table users add constraint users_subscription_tier_check
  check (subscription_tier in ('free', 'community', 'vault'));
```

**Files touching the subscription-tier vocabulary that need updates** (all switch `'premium'` → `'vault'`):

- [lib/admin/types.ts:4](lib/admin/types.ts#L4) — `SubscriptionTier` union
- [lib/stripe/webhooks.ts:349](lib/stripe/webhooks.ts#L349) — `subscription_tier: 'premium'` (hardcoded; replace with tier lookup from `priceTierMap`)
- [lib/paths/access.ts:10](lib/paths/access.ts#L10) — `if (user.subscription_tier !== 'premium') return false` (replace with `hasVaultAccess()`)
- [lib/paths/generate.ts:29](lib/paths/generate.ts#L29) — `userTier: 'free' | 'premium'` param type
- [lib/paths/catalog.ts:6](lib/paths/catalog.ts#L6) — same
- [app/[locale]/learn/paths/new/PathIntakeFlow.tsx:15](app/[locale]/learn/paths/new/PathIntakeFlow.tsx#L15) — prop type
- [app/[locale]/learn/paths/new/page.tsx:66](app/[locale]/learn/paths/new/page.tsx#L66) — cast
- [app/api/learn/paths/[id]/regenerate/route.ts:71](app/api/learn/paths/[id]/regenerate/route.ts#L71) — cast
- [app/api/learn/paths/generate/route.ts:75](app/api/learn/paths/generate/route.ts#L75) — cast
- [components/learn/PathIntakeForm.tsx:19](components/learn/PathIntakeForm.tsx#L19) — prop type
- [components/learn/StudyPathView.tsx:46](components/learn/StudyPathView.tsx#L46) — `hasPremium` flag (derive from `hasVaultAccess()`)
- [lib/vault/access.ts](lib/vault/access.ts) — the canonical "can this user see Vault content?" check; rewrite to use `hasVaultAccess()` from `lib/access/checks.ts`

**Files that should NOT change** (content-vocabulary `'premium'`, not subscription-vocabulary):

- `lib/vault/types.ts` — `VaultAccessTier` (content)
- `lib/content/types.ts` — `AccessTier` (content)
- `lib/dashboard/types.ts:80` — `access_tier` field on content
- `lib/vault/queries.ts` — `.eq('access_tier', 'premium')` filters (content queries)
- All `supabase/seed_*.sql` files — content seeds
- All `components/vault/*.tsx` and `components/admin/AdminVault*.tsx` — content UI
- `components/admin/AdminLibraryList.tsx` — content admin

### Duplicate subscription policy

Guest checkout + "one subscription per user" creates a real risk: a returning Vault subscriber could buy Community a second time under the same email, or a Community subscriber could buy Vault as a parallel subscription instead of an upgrade.

**Policy (chosen)**: in `/api/stripe/partner-checkout`, before creating the Checkout Session:

1. Look up the existing Stripe Customer by email via `stripe.customers.search({ query: \`email:'${email}'\` })`. (Email is taken from a thin client-side prompt — see below.)
2. If a customer exists with an active subscription, pass `customer: existingCustomerId` to `stripe.checkout.sessions.create`. Stripe Checkout will then offer the user the **Billing Portal upgrade flow** for subscription changes rather than creating a duplicate.
3. If no customer or no active subscription, proceed with guest checkout as planned.

**This requires a tiny email field on the landing CTA** — a one-line "Continue with email" interstitial that the partner-checkout route uses to do the customer lookup. Single text input, autofocus, Enter to submit. Adds ~3 seconds of friction but prevents duplicate-charge support tickets that would consume far more time.

**Alternative considered and rejected**: catch duplicates in the webhook and cancel/refund the lower-tier sub. Too clever, too refund-prone, too easy to get wrong silently. Server-side customer lookup before Checkout is the boring correct answer.

**Defensive idempotency in the webhook**: even with the policy above, the webhook still asserts at most one active subscription per user. If `customer.subscription.created` fires and the user already has `subscription_stripe_id` set to a different active subscription, log loudly + skip the update (don't downgrade them). Manual reconciliation if it ever happens.

### Request flow

```
PriceCard onClick (no HonuVibe auth required)
   └─> Tiny email interstitial: "Continue with email"
       (single input, autofocus, Enter to submit)

   └─> POST /api/stripe/partner-checkout
         body: { tier, cohortId?, locale, partnerSlug, email }

      Server steps:
        1. Validate body (zod schema)
        2. Look up Stripe Customer by email:
             const existing = await stripe.customers.search({
               query: `email:'${email}'`,
             });
           If found with active subscription, reuse customerId. Otherwise leave undefined.
        3. Resolve priceId from `TIER_REGISTRY` (tier → env var → process.env). USD-only; no locale branching.
        4. Resolve mode: tier === 'cohort' ? 'payment' : 'subscription'

      stripe.checkout.sessions.create({
        mode,
        ...(existingCustomerId
            ? { customer: existingCustomerId }
            : { customer_email: email }),    // pre-fills Stripe's email field
        // customer_creation only valid for mode='payment' or 'setup' — OMIT for subscription
        ...(mode === 'payment' && !existingCustomerId
            ? { customer_creation: 'always' }
            : {}),
        line_items: [{ price: priceId, quantity: 1 }],
        ...(mode === 'subscription' && tier === 'community'
            ? { subscription_data: { trial_period_days: 14, metadata: { checkout_kind: 'partner', partner_slug, tier, locale } } }
            : {}),
        billing_address_collection: 'required',   // JCT requirement
        automatic_tax: { enabled: true },
        metadata: {
          checkout_kind: 'partner',     // structured discriminator, not a regex'd string
          partner_slug,                  // 'vertice-society'
          tier,                          // 'community' | 'vault' | 'cohort'
          cohort_id: cohortId ?? '',
          locale,
        },
        success_url: `${origin}/${locale === 'ja' ? 'ja/' : ''}partners/vertice-society/thanks?tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${origin}/${locale === 'ja' ? 'ja/' : ''}partners/vertice-society#pricing`,
        locale: locale === 'ja' ? 'ja' : 'en',
      })

   └─> return { url: session.url }   →   browser redirects to Stripe
```

**Metadata convention**: structured fields (`checkout_kind`, `partner_slug`, `tier`, `cohort_id`, `locale`), not a delimited string. Webhook reads `metadata.checkout_kind === 'partner'` to branch. Zod schemas validate. No regex.

### Webhook flow (extends [lib/stripe/webhooks.ts](lib/stripe/webhooks.ts))

**No event ordering assumptions.** Stripe explicitly does not guarantee the order of `checkout.session.completed` vs `customer.subscription.created` vs `invoice.paid`. Every branch below is independently capable of resolving the user via `findOrCreateUserByEmail()` from any signal Stripe gives us.

**`checkout.session.completed`** — branch order matters in `handleCheckoutCompleted`:

```ts
// STEP 1 (NEW): partner branch — MUST be before the existing user_id/course_id guard,
// because partner sessions have no user_id or course_id in metadata.
if (session.metadata?.checkout_kind === 'partner') {
  await fulfillPartnerCheckout(session);
  return;
}

// STEP 2 (existing): ESL add-on branch — unchanged.
if (session.metadata?.type === 'esl_addon') {
  await handleESLPurchaseCompleted(...);
  return;
}

// STEP 3 (existing): course-enrollment branch — unchanged. The user_id/course_id
// guard at the top of the current function moves INTO this branch.
const userId = session.metadata?.user_id;
const courseId = session.metadata?.course_id;
if (!userId || !courseId) { /* log + return */ }
// ... existing enrollment logic
```

**Inside `fulfillPartnerCheckout(session)`** (`lib/partner-checkout/fulfill.ts`):

- `email = session.customer_details?.email` (Stripe always populates this on completed sessions).
- `user = await findOrCreateUserByEmail(supabase, email, session.customer_details?.name, locale)`.
- Attach `stripe_customer_id` to user if not already set.

- If `tier === 'cohort'`:
  - **Idempotency check**: `select id from cohort_enrollments where stripe_session_id = session.id` — return early if exists.
  - Look up cohort dates from `COHORT_REGISTRY[cohort_id]`.
  - Insert `cohort_enrollments` row + insert `payments` row (`type = 'cohort_purchase'`).
  - Set `users.is_vertice_member = true`.
  - Send cohort-welcome email (Zoom link, calendar invite, prep materials) + magic-link login email.

- If `tier === 'community'` or `tier === 'vault'`:
  - Subscription side-effects are handled by `customer.subscription.created`. Here we only:
    - Ensure `users.stripe_customer_id` is set (so the subscription handler can match by customer ID even if it fires first — see ordering note below).
    - Send the welcome email + magic-link login email.
  - **If the subscription handler already fired first**, `users.subscription_tier` will already be set; that's fine, we don't touch it.

**`customer.subscription.created`** — extend existing `handleSubscriptionCreated` at [webhooks.ts:324](lib/stripe/webhooks.ts#L324):

- **Out-of-order resilience**: don't return early if no user matches `stripe_customer_id`. Instead:
  ```ts
  let user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    // checkout.session.completed hasn't fired yet — fetch customer from Stripe to get email.
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || !customer.email) {
      // Genuinely no email — log loudly and skip; not retryable.
      console.error('[Webhook] subscription.created for customer with no email', customerId);
      return;
    }
    user = await findOrCreateUserByEmail(supabase, customer.email, customer.name, 'en');
    await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }
  ```
- Read `subscription.items.data[0].price.id`, look up tier in `priceTierMap` (includes `LEGACY_VAULT_PRICE_IDS` for older subscribers).
- If the lookup returns `undefined`, log loudly and skip — unknown price ID means data drift; don't guess.
- Set `users.subscription_tier = tier`, `subscription_stripe_id = subscription.id`, `subscription_status = subscription.status`, `subscription_expires_at = current_period_end`.
- **Duplicate-subscription guard**: if `users.subscription_stripe_id` is already set to a *different* still-active subscription ID, log loudly and skip — manual reconciliation. Do not silently downgrade.

**`customer.subscription.updated`** — same shape:
- Same out-of-order user resolution.
- Same price→tier lookup (handles Community → Vault upgrades).
- Same status/expires update.

**`customer.subscription.deleted`** — existing handler at [webhooks.ts:390](lib/stripe/webhooks.ts#L390) already clears `subscription_stripe_id`. Update: set `subscription_tier = 'free'` (was `'premium'`/'free' before — confirm) and `subscription_status = 'cancelled'`. Access continues until `subscription_expires_at` via `hasActiveSubscription()` grace logic.

**`invoice.paid`** — existing handler at [webhooks.ts:417](lib/stripe/webhooks.ts#L417):
- Same out-of-order user resolution.
- Look up tier from invoice line items' price ID via `priceTierMap`.
- Set `payments.type` to `'community_renewal'` for community subscriptions and `'vault_renewal'` for vault (existing handler hardcodes `'vault_renewal'` — update to be tier-aware).
- Set `payments.description` to the tier-specific name from the registry.
- **`payments.type` CHECK constraint**: check current allowed values in `supabase/migrations/`. Add `'community_renewal'` and `'cohort_purchase'` if missing, via a small migration.

**Idempotency** — every branch checks for existing rows by Stripe-side unique ID (`stripe_session_id`, `stripe_invoice_id`) before mutating. Matches existing patterns at [webhooks.ts:40-52](lib/stripe/webhooks.ts#L40-L52) and [webhooks.ts:442-448](lib/stripe/webhooks.ts#L442-L448).

---

## Files to create

| Path | Purpose |
|---|---|
| `app/api/stripe/partner-checkout/route.ts` | Single endpoint for all three tiers. Reads `{ tier, cohortId?, locale, partnerSlug }`. Resolves price ID + mode, creates Stripe Checkout Session with the right `subscription_data.trial_period_days` for Community. No auth gate (guest checkout). |
| `app/[locale]/partners/vertice-society/thanks/page.tsx` | Bilingual confirmation page. Reads `?tier=` and `?session_id=` from URL. Shows tier-specific copy ("Check your email for login link"), tier-specific access info (Discord invite for Community, course list for Vault, Zoom + calendar for Cohort), and a "Send me a magic link" button that posts to `/api/auth/magic-link`. |
| `lib/stripe/tiers.ts` | Single source of truth: `TIER_REGISTRY` mapping `tier` → `{ mode, trialDays?, priceEnvVar }`. USD only. Plus `priceTierMap` (reverse lookup: priceId → tier, for webhook). Includes `LEGACY_VAULT_PRICE_IDS` array. |
| `lib/stripe/cohorts.ts` | `COHORT_REGISTRY` mapping `cohort_id` → `{ priceEnvVar, startDate, endDate, bundleDaysAfterEnd: 90 }`. Add new cohort = one new entry + one new Stripe product. |
| `lib/access/checks.ts` | `hasCommunityAccess(user)`, `hasVaultAccess(user)`, `hasActiveCohortAccess(user)`. Pure functions, easy to unit-test. Used by future dashboard gating; not blocking for MVP. |
| `lib/auth/find-or-create.ts` | `findOrCreateUserByEmail(supabase, email, name?, locale?)` — extracted from webhook for reuse. Creates auth user via Supabase admin API, links `stripe_customer_id`, returns full row. |
| `lib/partner-checkout/fulfill.ts` | `fulfillCohortCheckout(session)` and `fulfillSubscriptionCheckout(session)` — called from webhook branches. Keeps webhook router thin. |
| `app/api/auth/magic-link/route.ts` | Accepts `{ session_id }` (NOT raw email). Server retrieves the Stripe Checkout Session, validates `payment_status === 'paid'` (or subscription `active`/`trialing`), checks the session was created in the last 30 minutes, then sends a magic link to the session's customer email via `supabase.auth.signInWithOtp()` with `emailRedirectTo: /learn/dashboard`. Rate-limited (5/hr/IP via [@vercel/firewall](https://vercel.com/docs/security/vercel-firewall) or a simple in-memory token bucket). |
| `supabase/migrations/0XX_subscription_tier_to_vault.sql` | Combined migration: (1) `update users set subscription_tier = 'vault' where subscription_tier = 'premium';` (2) drop + recreate the `subscription_tier` CHECK constraint with `('free', 'community', 'vault')`. Single transaction. |
| `supabase/migrations/0XX_cohort_enrollments.sql` | `create table cohort_enrollments (...)` per the schema in Architecture above. Includes `unique(user_id, cohort_id)`. Enable RLS, user can read own rows, service role can write. |
| `supabase/migrations/0XX_payments_type_expand.sql` | If `payments.type` CHECK constraint exists and excludes `'community_renewal'` / `'cohort_purchase'`, widen it. (Migration may be no-op if the column is text-only — verify first.) |

## Files to modify

| Path | Change |
|---|---|
| [components/partners/vertice/VerticeLanding.tsx](components/partners/vertice/VerticeLanding.tsx) | (1) Replace `PRICING_CTA_HREF` constant + `<a>` in `PriceCard` with a `<button>` that opens a small email interstitial, then calls `fetch('/api/stripe/partner-checkout', { body: { tier, cohortId, locale, partnerSlug, email } })`, then `window.location.href = url`. Keep `trackEvent('partner_cta_click', { partner, location: 'pricing', tier })` firing before the fetch. Add loading/disabled state. (2) **Update displayed prices** to match Stripe — see *Landing copy alignment* section. |
| [lib/stripe/webhooks.ts](lib/stripe/webhooks.ts) | Move existing `user_id`/`course_id` guard from top of `handleCheckoutCompleted` into the course-enrollment branch (so partner branch can run without those fields). Add partner branch as STEP 1 per Webhook flow above. Extend `handleSubscriptionCreated/Updated` with out-of-order user resolution and tier lookup via `priceTierMap`. Extend `handleInvoicePaid` to set tier-aware `payments.type` and `description`. Update `handleSubscriptionDeleted` to set `subscription_tier = 'free'`. Replace inline find-user logic with `findOrCreateUserByEmail`. |
| All 11 files listed in *Premium → Vault migration* | Mechanical `'premium'` → `'vault'` swap in subscription-tier vocabulary. Content-vocabulary files left alone. |
| `.env.local` + Vercel Preview env | Add test-mode price IDs (4 new + 2 replacement). |
| Vercel Production env | Add live-mode price IDs (4 new + 2 replacement) at deploy time. |

---

## Reuse map — what already exists, don't rebuild

- **Existing Vault subscription** — `STRIPE_VAULT_PRICE_USD/JPY` env vars + the entire `handleSubscriptionCreated/Updated/Deleted/handleInvoicePaid` chain in [webhooks.ts:324-461](lib/stripe/webhooks.ts#L324-L461). We extend, not duplicate.
- **`users.subscription_*` columns** — `subscription_tier`, `subscription_status`, `subscription_expires_at`, `subscription_stripe_id` all exist and work. Migration only widens the `subscription_tier` CHECK constraint to include `'community'`.
- **Trialing status support** — existing CHECK constraint at [001_phase2_schema.sql:21](supabase/migrations/001_phase2_schema.sql#L21) already includes `'trialing'`. No schema change for the Community trial.
- **`getServiceClient()`** for webhook DB writes — [webhooks.ts:8-17](lib/stripe/webhooks.ts#L8-L17).
- **Stripe client singleton** — [lib/stripe/client.ts](lib/stripe/client.ts).
- **Webhook signature verification + router** — [app/api/stripe/webhook/route.ts](app/api/stripe/webhook/route.ts). The new branches plug into the existing dispatcher.
- **Partner attribution cookie + resolver** — `getAttributedPartnerSlug()` from `@/lib/partner-attribution`; `hv_partner` cookie already set on mount by VerticeLanding.
- **`is_vertice_member` flag + 40% coupon** — migration 028, applied in [checkout/route.ts:84-88](app/api/stripe/checkout/route.ts#L84-L88). Cohort fulfillment sets this flag; subscription fulfillment too (Vertice members get the perk regardless of which tier they buy).
- **`trackEvent('partner_cta_click')`** — keep firing before the fetch in `PriceCard`.
- **`lib/vault/access.ts`** — existing `checkVaultAccess()` already reads `subscription_status` + `subscription_tier`. Update it to recognize `subscription_tier === 'vault'` (it currently checks `'premium'`) and to call `hasActiveCohortAccess()` for the bundle case. Same file; small edit.
- **Supabase magic-link auth** — `supabase.auth.signInWithOtp()` is already imported in [components/auth/AuthForm.tsx](components/auth/AuthForm.tsx). The new `/api/auth/magic-link` route just wraps it server-side.
- **`/api/auth/callback`** — already exists; fires `sendStudentOnboardingEmail`. Magic-link sign-in goes through the same callback, so onboarding emails work for free.

**What we explicitly do NOT reuse:**
- The existing `/api/stripe/subscribe` route. It requires auth and only knows about Vault. The new `/api/stripe/partner-checkout` route subsumes it. The `/learn/dashboard/billing` SubscribeButton can switch over in a follow-up; that's out of scope for this commit (the existing flow still works for logged-in users).
- `persistEnrollmentSplit()` — only relevant for course `enrollments`, not partner tiers. Skip until revenue-share for partner subs becomes a decision.

---

## Build order

1. **Stripe Dashboard (test mode first)** — Ryan creates Community + Cohort products + new Vault prices (6 prices total). Adds test-mode IDs to `.env.local` and Vercel Preview env.
2. **Migrations** —
   - `0XX_subscription_tier_to_vault.sql` — data migration `'premium'` → `'vault'` + widen CHECK constraint.
   - `0XX_cohort_enrollments.sql` — create table with `unique(user_id, cohort_id)` and RLS.
   - `0XX_payments_type_expand.sql` — widen `payments.type` CHECK if needed.
3. **Premium → Vault sweep** — mechanical `'premium'` → `'vault'` swap in the 11 subscription-tier files. Type checks pass before next step.
4. **Registries** — `lib/stripe/tiers.ts` (includes `LEGACY_VAULT_PRICE_IDS`) and `lib/stripe/cohorts.ts`.
5. **Helpers** — `lib/auth/find-or-create.ts`, `lib/partner-checkout/fulfill.ts`, `lib/access/checks.ts`.
6. **API routes** — `app/api/stripe/partner-checkout/route.ts` (with Stripe customer lookup) and `app/api/auth/magic-link/route.ts` (with session_id validation + rate limit).
7. **Webhook branches** — extend the four `handle*` functions per Webhook flow. Reorder `handleCheckoutCompleted` so partner branch runs before the course guard.
8. **Update `lib/vault/access.ts`** to use `hasVaultAccess()` from `lib/access/checks.ts`.
9. **Thanks page** — `app/[locale]/partners/vertice-society/thanks/page.tsx`. Bilingual, tier-aware, magic-link button posts `session_id`.
10. **Wire the CTAs + update landing prices** — same commit. Swap `<a>` → `<button>` with email interstitial in `PriceCard` ([VerticeLanding.tsx:2398](components/partners/vertice/VerticeLanding.tsx#L2398)), update displayed prices per *Landing copy alignment*.
11. **Verify end-to-end in test mode** (see Verification below).
12. **Deploy + flip Production env to live keys** — add live-mode price IDs to Vercel Production env, deploy.
13. **Live smoke test** — one real $29 Community signup with Ryan's card, cancel immediately.
14. **Write the pattern doc** — `docs/HonuVibe_PartnerCheckout_Spec_v1.md`. Written *after* implementation so it reflects shipped code.

Out of scope for this commit chain:
- Migrating the existing `/learn/dashboard/billing` SubscribeButton onto `/api/stripe/partner-checkout` (existing flow still works for logged-in users).
- Cohort capacity enforcement.
- Refund handler for partner subscriptions / cohorts.
- Dunning / past_due UX.
- App-level access gating in dashboard pages.

Each step is a separate commit straight to `main` per Ryan's preferred workflow.

---

## Design for reuse — what generalizes, what doesn't

This Vertice work is the first instance of a pattern HonuVibe will use repeatedly: **a paid landing page with one or more tiers (one-time and/or subscription) attributed to a partner or membership area, fulfilled by Stripe Checkout with guest-friendly auth**. To make it reusable without over-engineering on first deploy, we make a few specific choices:

**Generalize now (cheap):**

- **API route is named generically from day 1**: `/api/stripe/partner-checkout` (not `/api/stripe/vertice-checkout`). Takes `partnerSlug` in the body; first caller is Vertice but the contract is partner-agnostic.
- **Metadata convention**: structured fields, not a delimited string. `metadata.checkout_kind = 'partner'` is the discriminator; `partner_slug`, `tier`, `cohort_id`, `locale` are separate fields. Validated by zod in the webhook. No regex parsing.
- **Helpers extracted from the webhook**: `lib/auth/find-or-create.ts` and `lib/partner-checkout/fulfill.ts`. Both are pure functions, reusable for the HonuVibe-direct membership area and any future partner.
- **Tier registry**: `lib/stripe/tiers.ts` centralizes the price→tier mapping. New tier = one entry. New cohort = one entry in `lib/stripe/cohorts.ts`. No webhook code changes.
- **Tier names are product-scoped, not partner-scoped**: `community`, `vault`, `cohort` are HonuVibe tiers — Vertice just sells them. Other partners would sell the same tiers (or just some of them) without needing new fulfillment code.
- **Single subscription model + stacked access checks**: future tiers add themselves to the `subscription_tier` enum and the `hasXAccess()` functions in `lib/access/checks.ts`. The pattern handles N tiers without redesign.

**Keep partner-specific (don't preemptively abstract):**

- `is_vertice_member` flag + 40% course coupon — Vertice-only perk. Future partners get their own flag if needed.
- Thanks-page copy and welcome emails — Vertice-branded for now. Page route `/[locale]/partners/<slug>/thanks` generalizes via dynamic segment; copy can templatize when partner #2 lands.
- `partner_slug` field in `cohort_enrollments` — captures attribution but doesn't drive fulfillment logic. Cohorts are HonuVibe products attributed to a partner, not partner-owned products.

**Cohort dates live in code, not Stripe metadata** — `lib/stripe/cohorts.ts` is the source of truth. Stripe metadata is documentation; the webhook reads from the code registry. This means cohort date changes don't require Stripe edits.

---

## Pattern doc outline — `docs/HonuVibe_PartnerCheckout_Spec_v1.md`

Written after step 8. Sits alongside `HonuVibe_Vault_Spec_v1.md` and `HonuVibe_TechSpec_v1.md`. Audience: future Ryan, future contractors, future Claude sessions.

Sections:

1. **Purpose & scope** — when to use this pattern (any paid offering tied to a landing page, partner or first-party).
2. **Concepts** — partner slug, tier, attribution cookie, fulfillment, guest checkout. Each defined once.
3. **Stripe product conventions** — naming, metadata (`partner_slug`, `tier`), currency rules (USD cents vs JPY zero-decimal), env-var naming pattern.
4. **Request/response contract** — `POST /api/stripe/partner-checkout { partner_slug, tier, locale } → { url }`.
5. **Webhook contract** — which events matter, the `metadata.checkout_kind` discriminator, out-of-order event resilience, `fulfillPartnerCheckout` hook signature, idempotency rules.
6. **DB schema** — `users.subscription_tier` enum, `cohort_enrollments` table, derived access functions in `lib/access/checks.ts`. When to add a new tier vs a new attribution column vs a new flag.
7. **Attribution** — `hv_partner` cookie set on landing, resolution in webhook, `users.referred_by_partner_id` first-touch rule.
8. **Adding a new partner — checklist** — step-by-step (create Stripe products, env vars, add fulfillment case, build landing page, wire CTAs to the shared route). The whole point of the doc.
9. **HonuVibe membership area** — short section on how the same pattern applies to first-party memberships (Vault, Community), and what's different (no `partner_slug`, fulfillment maps to `subscription_tier`).
10. **Open questions / known gaps** — refunds, proration, multi-cohort, dunning, in-app upgrade UX, legacy-price subscriber migration. Honest list, not aspirational.
11. **Glossary** — Vertice "Vault" vs HonuVibe "Vault" disambiguation, since this confuses every reader.

Length target: short enough to read in one sitting (~5-8 pages rendered). Link to actual file paths and line numbers in the code, not copy/paste of code blocks — those rot.

---

## Environment matrix

| Environment | Stripe keys | Price IDs |
|---|---|---|
| Local dev (`.env.local`) | **test** (`sk_test_…` / `pk_test_…`) | test-mode IDs |
| Vercel Preview | **test** | test-mode IDs |
| Vercel Production | **live** (`sk_live_…` / `pk_live_…`) | live-mode IDs |

**Never swap keys in `.env.local`** to test live behavior. If a bug only repros against live, fix it forward via a Preview branch with a feature flag, or use the Stripe Dashboard event-log to inspect what happened.

Webhook endpoints are environment-scoped too: register `localhost:3000/api/stripe/webhook` in Stripe test-mode CLI, and `https://honuvibe.ai/api/stripe/webhook` in live-mode Dashboard. `STRIPE_WEBHOOK_SECRET` differs per environment; both go in their respective envs.

---

## Verification

End-to-end test in **Stripe test mode**. Use [test cards](https://docs.stripe.com/testing) `4242 4242 4242 4242`. Run `stripe listen --forward-to localhost:3000/api/stripe/webhook` in a separate terminal.

### Community ($29/mo with 14-day trial)

1. Open `/ja/partners/vertice-society` in an incognito window. Click "コミュニティに参加する".
2. Confirm Plausible `partner_cta_click` fires with `tier: 'community'`.
3. At Stripe Checkout: enter a fresh email, complete with test card. The "trial" should be visible at checkout — Stripe shows "Free for 14 days, then $29/month".
4. Redirect to `/ja/partners/vertice-society/thanks?tier=community&session_id=cs_...`.
5. Verify in Supabase:
   - New `users` row exists for the email.
   - `users.subscription_tier = 'community'`
   - `users.subscription_status = 'trialing'`
   - `users.subscription_expires_at` ≈ now + 14 days
   - `users.stripe_customer_id` set
6. Two emails land: welcome + magic-link login.
7. Click "Send me a magic link" on the thanks page → second magic link email.
8. Click magic link → land on `/learn/dashboard` fully authenticated.
9. **Trial-to-paid transition test**: advance the Stripe test clock to day 15 (or use Stripe CLI `stripe trigger invoice.paid`). Confirm:
   - `payments` row inserted with `type: 'community_renewal'` (or whatever we settle on).
   - `users.subscription_status = 'active'`.
10. **Cancellation test**: cancel via Stripe Dashboard. Confirm:
    - `users.subscription_status = 'cancelled'`, `subscription_tier = 'free'`.
    - Access remains until `subscription_expires_at` (Stripe-default behavior; we honor it via the `hasCommunityAccess` check).

### Vault ($49/mo, no trial)

Same as Community but no trial step. Confirm `subscription_tier = 'vault'` and that `hasCommunityAccess()` returns true (stacked access — Vault implies Community).

### Cohort ($1,250 one-time)

1. Open landing, click "ライブコホートに申し込む".
2. Stripe Checkout — one-time payment, no recurring.
3. Redirect to thanks page with `tier=cohort`.
4. Verify:
   - `cohort_enrollments` row exists with `cohort_id = 'may2026'`, `bundle_access_starts_at = 2026-05-23`, `bundle_access_ends_at = 2026-09-25` (cohort end + 90 days).
   - `users.is_vertice_member = true`.
   - `users.subscription_tier` unchanged (cohort is not a subscription).
5. `hasVaultAccess(user)` and `hasCommunityAccess(user)` both return `true` for the bundle window.
6. Welcome email arrives with Zoom + calendar attachment + magic link.

### Idempotency

For each tier, replay the webhook from the Stripe Dashboard → "Events" → "Resend." Confirm no duplicate rows in `cohort_enrollments` / `payments` and no state churn on the user.

### Out-of-order webhook resilience (critical)

This test exercises the no-event-ordering-assumption design:

1. Stop `stripe listen` (so events queue at Stripe).
2. Complete a Community checkout in the browser. Wait 30 seconds — Stripe has now queued `checkout.session.completed` AND `customer.subscription.created` (and probably `invoice.paid` for the trial).
3. In Stripe Dashboard → Events, manually replay `customer.subscription.created` **before** `checkout.session.completed`.
4. Restart `stripe listen`. Replay in reverse order: subscription.created first, then checkout.session.completed.
5. Verify final state is correct: user exists, `subscription_tier = 'community'`, `subscription_status = 'trialing'`, no duplicate rows, no log errors. The subscription handler should have called `findOrCreateUserByEmail()` itself instead of bailing.

### Duplicate-subscription guard

1. Subscribe to Community as `test@example.com`.
2. Try to subscribe to Vault as the same email. Confirm:
   - Server-side customer lookup finds the existing Stripe Customer.
   - Stripe Checkout offers an upgrade flow (or at minimum reuses the customer so the user doesn't get billed twice).
   - If somehow a second active subscription is created, the webhook logs loudly and skips overwriting `subscription_stripe_id`.

### Magic-link abuse guard

1. With a valid completed `session_id`, post to `/api/auth/magic-link` — magic link sent.
2. Post the same `session_id` 10 times in a row — rate limit kicks in after 5/hr.
3. Post with a random `session_id` (not a real Stripe session) — 404.
4. Post with a `session_id` for an unpaid/abandoned session — 403.
5. Post with a `session_id` from a session older than 30 minutes — 410 Gone.

### Premium → Vault data migration

1. Before running the migration, count: `select count(*) from users where subscription_tier = 'premium';`. Note the number.
2. Apply migration.
3. After: `select count(*) from users where subscription_tier = 'vault';` — must match. `select count(*) from users where subscription_tier = 'premium';` — must be 0.
4. Existing Vault subscriber loads `/learn/dashboard` — content gates still work (the `hasVaultAccess()` rewrite picks up the new value).

### Live smoke test (Production)

After deploying to Production with live keys:

1. One real $29 Community signup with Ryan's own card. Confirm:
   - Welcome email + magic-link email arrive.
   - Magic link logs Ryan into `/learn/dashboard`.
   - `users` row in Production DB has correct tier/status/expires.
2. Immediately cancel via Stripe Dashboard. Confirm `subscription_status = 'cancelled'`, `subscription_tier = 'free'`, access continues until `subscription_expires_at`.
3. Optional: one signup from a JP-locale browser to confirm the landing renders JP copy with USD prices and "billed in USD · 米ドル建て請求" disclaimer.

---

## Out of scope (call out, don't build)

- **Migrate `/learn/dashboard/billing` SubscribeButton** off `/api/stripe/subscribe` onto `/api/stripe/partner-checkout`. The existing route still works; consolidation is a follow-up.
- **Cohort seat enforcement** — manual.
- **App-level access gating in the dashboard** — `lib/access/checks.ts` is built but using it to gate routes/pages is a separate sweep.
- **Refund handler for partner subscriptions** — existing `charge.refunded` branch is course-specific. Refund handling for subscriptions/cohorts → manual in Supabase if it happens before we build a dedicated branch.
- **Discounts / promo codes** for partner tiers — add `allow_promotion_codes: true` later if needed.
- **Subscription upgrade UX** (Community → Vault from inside the dashboard) — Stripe Billing Portal handles this; building a custom upgrade flow is future work.
- **Dunning / past_due UX** — Stripe retries the card; we don't pre-emptively cut access. Build dedicated dunning later if it becomes a real problem.
- **Migrating existing Vault subscribers to the new $49 price** — legacy price IDs stay in `priceTierMap`; existing subs keep paying their old rate until we run a deliberate `subscriptions.update` migration.
