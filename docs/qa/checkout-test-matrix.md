# Checkout Test Matrix (P0 — money-path validation)

Manual QA with Stripe **test cards** (no E2E harness exists). Run in **both locales**. This is the load-bearing revenue gate — run before optimizing anything upstream.

Stripe test cards: success `4242 4242 4242 4242`; auth-required `4000 0025 0000 3155`; decline `4000 0000 0000 9995`. Any future expiry, any CVC.

## Course enrollment (`/api/stripe/checkout` via `/learn/[slug]/checkout`)

| # | Case | Expected | Code ref |
|---|---|---|---|
| 1 | Anon clicks Enroll | Redirect to `/learn/auth?redirect=/learn/{slug}`; after auth, lands back on course page (one extra click to re-enroll — **known friction, acceptable**) | `EnrollButton.tsx:75-80` |
| 2 | Logged-in, paid course (EN) | `checkout_started` fires; Stripe session in **USD cents**; lands on `/learn/dashboard/{slug}?enrolled=true` | `checkout/route.ts:91-148` |
| 3 | Logged-in, paid course (JA) | Price in **JPY zero-decimal** (`unit_amount = price_jpy`, not ×100); Stripe UI in `ja`; `/ja` success URL | `checkout/route.ts:91-93,147` |
| 4 | Course full | 400 "Course is full"; CTA shows `cohort_full`, disabled | `checkout/route.ts:53-58`, `EnrollButton.tsx:62-68` |
| 5 | Already enrolled | 400 "Already enrolled"; CTA shows `continue` | `checkout/route.ts:60-74`, `EnrollButton.tsx:48-60` |
| 6 | Unpublished / no price | 400 (not available / no price) | `checkout/route.ts:45-50,95-100` |
| 7 | Vertice member | Auto-coupon applied; `allow_promotion_codes` suppressed (mutually exclusive) | `checkout/route.ts:83-88,136` |
| 8 | Free course | `simulatedEnroll` server action; no Stripe | `EnrollButton.tsx:92-101` |
| 9 | Webhook fulfillment | `checkout.session.completed` → enrollment created **idempotently** (retry-safe); `checkout_completed` fires; capacity +1 | `webhooks.ts:72-90` |
| 10 | Confirmation page | Renders in both locales | success_url `/learn/dashboard/{slug}` |

## Subscription (`/api/stripe/subscribe`, community/vault)

| # | Case | Expected | Code ref |
|---|---|---|---|
| 11 | Anon GET `?tier=vault` | 302 → `/learn/auth?redirect=<subscribe url>`; **after auth resumes checkout** (redirect = subscribe URL) | `subscribe/route.ts:107-119` |
| 12 | Already subscribed | 400 (POST) / 302 → billing `?upgrade=true` (GET) — no second session | `subscribe/route.ts:30-42,133-145` |
| 13 | Trial tiers | `trial_period_days` applied per `TIER_REGISTRY` (community has trial, vault none) | `subscribe/route.ts:65,77` |
| 14 | New customer | Stripe customer created + `stripe_customer_id` persisted | `subscribe/route.ts:44-62` |
| 15 | Subscription completed | `customer.subscription.created` → tier set via price-ID; `checkout_completed` fires; duplicate-sub guard holds | `webhooks.ts` `handleSubscriptionCreated` |

## Gaps / notes
- **Case 1 friction:** course enroll sends unauth users back to the course page, not directly into checkout (subscribe GET does resume). Acceptable for now; revisit if Case-1→Case-2 drop is high in analytics.
- Completion counts come from the **webhook** (`checkout_completed`), reconciled against the **Stripe dashboard** (true revenue).
