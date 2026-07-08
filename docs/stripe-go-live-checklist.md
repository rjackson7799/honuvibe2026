# Stripe go-live checklist

Context: production runs on a **live** Stripe key (`sk_live_…`), but the subscription products
(Vault, Community) were only ever created in test/sandbox, so the **Vault + Community subscribe
flows cannot succeed in production** until this is done. One-time **course checkout is
unaffected** — it builds the price inline (`price_data`), so it works on the live key already.

No code change is required — this is Stripe + Vercel config. (The test IDs in
`LEGACY_VAULT_PRICE_IDS` in `lib/stripe/tiers.ts` are harmless in live: a live event never
carries a test price ID, so they simply never match. Optional cleanup, not a blocker.)

## 1. Live products (DONE — created Jul 5)
- [x] HonuVibe Vault — $99.00/mo recurring
- [x] HonuVibe Community — $29.00/mo recurring
- Grab each product's **price ID**: open the product → click the price → copy `price_…`.

## 2. Vercel Production env vars
Set these to their **live** values (Vercel → Project → Settings → Environment Variables → Production):
- [ ] `STRIPE_SECRET_KEY` = `sk_live_…`  *(already set — but resolve the "Needs Attention" flag)*
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_…`  **← must be live, or the embedded course-checkout card breaks in the browser**
- [ ] `STRIPE_VAULT_PRICE_USD` = live Vault **$99** price ID
- [ ] `STRIPE_COMMUNITY_PRICE_USD` = live Community **$29** price ID
- [ ] `STRIPE_WEBHOOK_SECRET` = live webhook signing secret (from step 3)
- [ ] `STRIPE_COHORT_MAY2026_PRICE_USD` = live cohort price ID — **only if** selling that cohort live (else the cohort purchase flow errors when used)
- [ ] `STRIPE_VERTICE_COUPON_ID` = live coupon ID — **only if** the Vertice member discount is used live

## 3. Live webhook (easy to miss — without it, paid subscriptions don't get recorded)
Stripe (Live mode) → Developers → Webhooks → **Add endpoint**:
- URL: `https://<your-production-domain>/api/stripe/webhook`
- Events (exactly what the handler consumes — `app/api/stripe/webhook/route.ts`):
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
- Copy the endpoint's **Signing secret** → set `STRIPE_WEBHOOK_SECRET` (step 2).

## 4. Redeploy
Env changes only take effect on a new deployment. Redeploy production (Vercel → Deployments →
⋯ → Redeploy, or push a commit).

## 5. Verify (live)
- [ ] Vault subscribe end-to-end with a **real card** (you can refund/cancel after): confirm the
      subscription is created AND the account gains Vault access (webhook fired → row written).
- [ ] Community subscribe likewise.
- [ ] One course checkout still completes (confirms the live `pk`/`sk` pair works).
- [ ] In Stripe → Developers → Webhooks, confirm events are being **delivered** (200s), not failing.
