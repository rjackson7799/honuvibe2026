# Payments, Subscriptions & Admin Dashboard — Design Document

**Date:** 2026-03-02
**Status:** Approved

## Business Model

- **Courses**: One-time purchase via Stripe Checkout (already working)
- **The Vault**: Standalone monthly subscription ($50/mo USD, JPY equivalent)
- **Course perk**: Active course students get Vault access included for enrollment duration
- **Vault access rule**: User has active Stripe subscription OR any active course enrollment

## Architecture: Stripe Subscriptions (Approach A)

The Vault uses Stripe Subscriptions for automatic monthly billing, dunning/retry on failed payments, and Stripe Customer Portal for self-service management.

### Vault Access Logic

```
hasVaultAccess(userId) =
  user.subscription_status === 'active'
  OR user has any enrollment with status = 'active'
```

Two independent paths to access. Course students don't need a Stripe subscription — their access is granted via enrollment status.

### Data Model

**New `payments` table** — unified billing history for all transaction types:
- `type`: course_purchase | vault_subscription | vault_renewal
- `receipt_url`: link to Stripe-hosted receipt (no custom PDF generation)
- Tracks both course purchases and subscription payments

**Existing `users` table** — subscription fields already in schema:
- `subscription_tier` (free | premium)
- `subscription_stripe_id` (Stripe Subscription ID)
- `subscription_status` (none | active | past_due | cancelled | trialing)
- `subscription_expires_at`

### Stripe Webhook Events

| Event | Action |
|-------|--------|
| `checkout.session.completed` (existing) | Create enrollment + log payment |
| `customer.subscription.created` | Set user subscription active |
| `customer.subscription.updated` | Update subscription status |
| `customer.subscription.deleted` | Set user subscription cancelled |
| `invoice.paid` | Log renewal payment with receipt URL |

### User Billing Page (`/learn/dashboard/billing`)

Three sections:
1. **Vault Status Card** — subscription state, manage via Stripe Portal, or subscribe CTA
2. **Payment History** — all transactions with Stripe receipt links
3. **Payment Method** — manage via Stripe Customer Portal

### Admin Revenue Dashboard (`/admin/revenue`)

1. **Revenue cards** — total USD/JPY, active subscribers, active enrollments
2. **Transactions table** — filterable, exportable to CSV
3. **Enhanced student list** — subscription status, vault access, total spent columns

### Receipts

Using Stripe-hosted receipts (no custom PDF generation). Each payment record stores the `receipt_url` from Stripe, displayed as a link in billing history.
