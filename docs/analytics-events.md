# Analytics Event Taxonomy — Funnel Spine

**Source of truth for funnel events.** Define an event here (name, trigger, props, owner, destination goal) *before* wiring it. Keep props **non-PII** (never email, name, or free-text).

- **Transport:** client events via `window.plausible` (`lib/analytics.ts#trackEvent`); server events via the Plausible Events API (`lib/analytics-server.ts#trackServerEvent`). Both no-op unless `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set.
- **Why server-side for checkout:** client-only completion undercounts (ad-blockers, Stripe redirect). `checkout_started`/`checkout_completed` fire server-side so the count is ad-block-proof; **Stripe dashboard remains the financial source of truth.**
- **Props are stringified** (Plausible only accepts string props).

## Funnel spine (5 events)

| Event | Trigger | Side | Required props | Destination goal | Owner |
|---|---|---|---|---|---|
| `course_enroll_cta_click` | User clicks the enroll CTA (`EnrollButton`) | client | `course_slug`, `is_paid` ("true"/"false"), `locale` | Intent → measures CTA→checkout drop | growth |
| `checkout_started` | Stripe Checkout Session created (course + subscription routes) | server | `kind` ("course"/"community"/"vault"), `currency`, `slug_or_tier` | Funnel: initiated (incl. abandons) | growth |
| `checkout_completed` | `checkout.session.completed` / `customer.subscription.created` webhook, after fulfillment | server | `kind`, `currency` | **Conversion goal** (ad-block-proof) | growth |
| `org_inquiry_submitted` | "For Organizations" / partnership inquiry POST succeeds (P1c) | server | `source` ("team_training"…), `locale` | B2B lead goal | growth |
| `free_sample_started` | Free-sample landing email capture submitted (P3a) | client | `lesson_slug`, `locale` | Top-of-funnel goal | growth |

**Deferred (add only once a leak is localized):** `hero_cta_click(destination)`, `learn_pricing_cta_click(tier)`, `workbench_demo_view`. Avoids "measure everything, learn nothing."

## Drop-off reading
`course_enroll_cta_click` → `checkout_started` = auth/onboarding friction. `checkout_started` → `checkout_completed` = the highest-value leak (abandoned checkout). Reconcile `checkout_completed` counts against Stripe.

## PII rule
No event carries `email`, `person_name`, or free-text. `free_sample_started` carries `lesson_slug`/`locale` only — never the captured email.

## Plausible goal setup (Ryan checkpoint)
In the Plausible dashboard, add custom-event goals for: `checkout_completed`, `checkout_started`, `org_inquiry_submitted`, `course_enroll_cta_click`, `free_sample_started`. Confirm `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set in all environments; optionally set `PLAUSIBLE_API_URL` if self-hosting.
