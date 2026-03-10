# Payments, Subscriptions & Admin Dashboard — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Vault monthly subscription ($50/mo), user billing dashboard with payment history/receipts, and admin revenue overview with user status tracking.

**Architecture:** Stripe Subscriptions for The Vault recurring billing, Stripe Customer Portal for self-service management (cancel, update payment method), new `payments` table for unified billing history, Stripe-hosted receipts (no custom PDFs). Vault access = active Stripe subscription OR active course enrollment.

**Tech Stack:** Stripe SDK (already installed), Supabase (Postgres + RLS), Next.js App Router, next-intl, Tailwind CSS, Lucide icons.

---

## Task 1: Database Migration — `payments` Table

**Files:**
- Create: `supabase/migrations/002_payments_billing.sql`

**Step 1: Write the migration**

```sql
-- Payments table — unified billing history for courses + vault subscriptions
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('course_purchase', 'vault_subscription', 'vault_renewal')),
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  stripe_checkout_session_id text,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded', 'refunded', 'failed')),
  receipt_url text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can read their own payments
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert (webhooks)
CREATE POLICY "Service role can insert payments"
  ON payments FOR INSERT
  WITH CHECK (true);

-- Admin can view all payments
CREATE POLICY "Admin can view all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

**Step 2: Run the migration against Supabase**

Run: `npx supabase db push` or apply via Supabase Dashboard SQL Editor.

**Step 3: Commit**

```bash
git add supabase/migrations/002_payments_billing.sql
git commit -m "feat: add payments table for billing history"
```

---

## Task 2: Payment Types & Queries

**Files:**
- Create: `lib/payments/types.ts`
- Create: `lib/payments/queries.ts`

**Step 1: Create types**

File: `lib/payments/types.ts`

```typescript
export type PaymentType = 'course_purchase' | 'vault_subscription' | 'vault_renewal';
export type PaymentStatus = 'succeeded' | 'refunded' | 'failed';

export interface Payment {
  id: string;
  user_id: string;
  type: PaymentType;
  course_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  stripe_checkout_session_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  receipt_url: string | null;
  description: string | null;
  created_at: string;
}

export interface PaymentWithUser extends Payment {
  user_email: string | null;
  user_name: string | null;
}
```

**Step 2: Create queries**

File: `lib/payments/queries.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import type { Payment } from './types';

export async function getUserPayments(userId: string): Promise<Payment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
```

**Step 3: Commit**

```bash
git add lib/payments/types.ts lib/payments/queries.ts
git commit -m "feat: add payment types and query functions"
```

---

## Task 3: Vault Access Helper

**Files:**
- Create: `lib/vault/access.ts`

**Step 1: Create vault access check**

File: `lib/vault/access.ts`

```typescript
import { createClient } from '@/lib/supabase/server';

export interface VaultAccessResult {
  hasAccess: boolean;
  source: 'subscription' | 'enrollment' | null;
  subscriptionStatus: string | null;
  activeCourseName: string | null;
}

export async function checkVaultAccess(userId: string): Promise<VaultAccessResult> {
  const supabase = await createClient();

  // Check subscription status
  const { data: user } = await supabase
    .from('users')
    .select('subscription_status, subscription_tier')
    .eq('id', userId)
    .single();

  if (user?.subscription_status === 'active') {
    return {
      hasAccess: true,
      source: 'subscription',
      subscriptionStatus: user.subscription_status,
      activeCourseName: null,
    };
  }

  // Check for active course enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, course:courses(title_en)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (enrollment) {
    const course = enrollment.course as unknown as { title_en: string } | null;
    return {
      hasAccess: true,
      source: 'enrollment',
      subscriptionStatus: user?.subscription_status ?? 'none',
      activeCourseName: course?.title_en ?? null,
    };
  }

  return {
    hasAccess: false,
    source: null,
    subscriptionStatus: user?.subscription_status ?? 'none',
    activeCourseName: null,
  };
}
```

**Step 2: Commit**

```bash
git add lib/vault/access.ts
git commit -m "feat: add vault access check helper"
```

---

## Task 4: Stripe Subscribe API Route

**Files:**
- Create: `app/api/stripe/subscribe/route.ts`

**Step 1: Create the subscription checkout endpoint**

This mirrors the pattern in `app/api/stripe/checkout/route.ts` but uses `mode: 'subscription'` with pre-created Stripe Prices.

File: `app/api/stripe/subscribe/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { locale } = (await request.json()) as { locale: string };
    const isJapanese = locale === 'ja';

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('users')
      .select('stripe_customer_id, subscription_status, email, full_name')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_status === 'active') {
      return NextResponse.json(
        { error: 'Already subscribed' },
        { status: 400 },
      );
    }

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: profile?.full_name ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Select price based on locale
    const priceId = isJapanese
      ? process.env.STRIPE_VAULT_PRICE_JPY
      : process.env.STRIPE_VAULT_PRICE_USD;

    if (!priceId) {
      console.error('[Stripe Subscribe] Vault price ID not configured');
      return NextResponse.json(
        { error: 'Subscription not configured' },
        { status: 500 },
      );
    }

    const origin =
      request.headers.get('origin') ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      'http://localhost:3000';

    const localePrefix = isJapanese ? '/ja' : '';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        user_id: user.id,
        type: 'vault_subscription',
        locale,
      },
      success_url: `${origin}${localePrefix}/learn/dashboard/billing?subscribed=true`,
      cancel_url: `${origin}${localePrefix}/learn/dashboard/billing`,
      locale: isJapanese ? 'ja' : 'en',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[Stripe Subscribe] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription checkout' },
      { status: 500 },
    );
  }
}
```

**Step 2: Add env vars to `.env.local`**

```
STRIPE_VAULT_PRICE_USD=price_xxx  # Create in Stripe Dashboard first
STRIPE_VAULT_PRICE_JPY=price_yyy  # Create in Stripe Dashboard first
```

**Step 3: Commit**

```bash
git add app/api/stripe/subscribe/route.ts
git commit -m "feat: add Vault subscription checkout endpoint"
```

---

## Task 5: Stripe Customer Portal API Route

**Files:**
- Create: `app/api/stripe/portal/route.ts`

**Step 1: Create the portal session endpoint**

File: `app/api/stripe/portal/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found' },
        { status: 400 },
      );
    }

    const { locale } = (await request.json()) as { locale: string };
    const isJapanese = locale === 'ja';
    const localePrefix = isJapanese ? '/ja' : '';

    const origin =
      request.headers.get('origin') ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}${localePrefix}/learn/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[Stripe Portal] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 },
    );
  }
}
```

**Step 2: Commit**

```bash
git add app/api/stripe/portal/route.ts
git commit -m "feat: add Stripe Customer Portal endpoint"
```

---

## Task 6: Webhook Handlers — Subscriptions + Payment Logging

**Files:**
- Modify: `lib/stripe/webhooks.ts` (add new handlers, update existing)
- Modify: `app/api/stripe/webhook/route.ts` (route new event types)

**Step 1: Add subscription and invoice handlers to `lib/stripe/webhooks.ts`**

Add these functions after the existing `handleCheckoutCompleted`:

```typescript
export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  const supabase = getServiceClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) {
    console.error('[Stripe Webhook] No user found for customer:', customerId);
    return;
  }

  await supabase
    .from('users')
    .update({
      subscription_tier: 'premium',
      subscription_stripe_id: subscription.id,
      subscription_status: subscription.status,
      subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('id', user.id);
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  const supabase = getServiceClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) return;

  const status = subscription.cancel_at_period_end ? 'cancelled' : subscription.status;

  await supabase
    .from('users')
    .update({
      subscription_status: status,
      subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('id', user.id);
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  const supabase = getServiceClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) return;

  await supabase
    .from('users')
    .update({
      subscription_tier: 'free',
      subscription_status: 'cancelled',
      subscription_stripe_id: null,
    })
    .eq('id', user.id);
}

export async function handleInvoicePaid(
  invoice: Stripe.Invoice,
): Promise<void> {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return;

  const supabase = getServiceClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) return;

  // Determine payment type from invoice lines
  const isSubscription = invoice.lines?.data?.some(
    (line) => line.type === 'subscription',
  );

  // Check idempotency
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_invoice_id', invoice.id)
    .maybeSingle();

  if (existing) return;

  await supabase.from('payments').insert({
    user_id: user.id,
    type: isSubscription ? 'vault_renewal' : 'course_purchase',
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: typeof invoice.payment_intent === 'string'
      ? invoice.payment_intent
      : (invoice.payment_intent?.id ?? null),
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: 'succeeded',
    receipt_url: invoice.hosted_invoice_url ?? null,
    description: isSubscription ? 'The Vault — Monthly Subscription' : (invoice.lines?.data?.[0]?.description ?? null),
  });
}
```

**Step 2: Update `handleCheckoutCompleted` to also log course payments**

In the existing `handleCheckoutCompleted` function in `lib/stripe/webhooks.ts`, add payment logging after the enrollment is created (after the `Increment enrollment count` section):

```typescript
  // Log payment record for billing history
  await supabase.from('payments').insert({
    user_id: userId,
    type: 'course_purchase',
    course_id: courseId,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? null),
    amount: session.amount_total ?? 0,
    currency,
    status: 'succeeded',
    receipt_url: null, // Stripe receipt URL not available on session object directly
    description: `Course enrollment`,
  });
```

**Step 3: Route new events in `app/api/stripe/webhook/route.ts`**

Update the switch statement to add:

```typescript
      case 'customer.subscription.created': {
        const subscription = event.data.object;
        await handleSubscriptionCreated(subscription);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        await handleInvoicePaid(invoice);
        break;
      }
```

And update the imports:

```typescript
import {
  handleCheckoutCompleted,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
} from '@/lib/stripe/webhooks';
```

**Step 4: Commit**

```bash
git add lib/stripe/webhooks.ts app/api/stripe/webhook/route.ts
git commit -m "feat: add subscription and invoice webhook handlers"
```

---

## Task 7: i18n Keys — Billing + Admin Revenue

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ja.json`

**Step 1: Add billing keys to `messages/en.json`**

Add inside the `"dashboard"` object (after `"nav_settings"`):

```json
    "nav_billing": "Billing",
    "heading_billing": "Billing"
```

Add a new top-level `"billing"` section:

```json
  "billing": {
    "title": "Billing & Subscription",
    "vault_status": "Vault Subscription",
    "vault_active": "Active",
    "vault_cancelled": "Cancelled",
    "vault_none": "Not Subscribed",
    "vault_included": "Included with {courseName}",
    "vault_pitch": "Get unlimited access to premium self-study videos, walkthroughs, and build-alongs.",
    "subscribe_vault": "Subscribe to The Vault",
    "manage_subscription": "Manage Subscription",
    "update_payment": "Update Payment Method",
    "next_billing": "Next billing date: {date}",
    "payment_history": "Payment History",
    "no_payments": "No payments yet.",
    "receipt": "Receipt",
    "course_purchase": "Course Purchase",
    "vault_subscription": "Vault Subscription",
    "vault_renewal": "Vault Renewal",
    "subscribed_success": "Welcome to The Vault!"
  }
```

Add inside an `"admin_revenue"` section:

```json
  "admin_revenue": {
    "title": "Revenue",
    "total_usd": "Total Revenue (USD)",
    "total_jpy": "Total Revenue (JPY)",
    "active_subscribers": "Active Subscribers",
    "active_enrollments": "Active Enrollments",
    "this_month": "This Month",
    "all_time": "All Time",
    "transactions": "Transactions",
    "export_csv": "Export CSV",
    "filter_type": "Type",
    "filter_currency": "Currency",
    "filter_all": "All",
    "col_date": "Date",
    "col_user": "User",
    "col_type": "Type",
    "col_description": "Description",
    "col_amount": "Amount",
    "col_status": "Status"
  }
```

**Step 2: Add corresponding JP translations to `messages/ja.json`**

Mirror the same structure with Japanese translations.

**Step 3: Commit**

```bash
git add messages/en.json messages/ja.json
git commit -m "feat: add billing and revenue i18n keys"
```

---

## Task 8: Student Nav — Add Billing Item

**Files:**
- Modify: `components/learn/StudentNav.tsx`

**Step 1: Add CreditCard import and billing nav item**

In `components/learn/StudentNav.tsx`, add `CreditCard` to the lucide-react import:

```typescript
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Library,
  PlaySquare,
  Users,
  CreditCard,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
```

Add billing item to `navItems` array between Community and Settings:

```typescript
  { href: '/learn/dashboard/community', labelKey: 'nav_community', icon: Users, exact: false },
  { href: '/learn/dashboard/billing', labelKey: 'nav_billing', icon: CreditCard, exact: false },
  { href: '/learn/dashboard/settings', labelKey: 'nav_settings', icon: Settings, exact: false },
```

**Step 2: Commit**

```bash
git add components/learn/StudentNav.tsx
git commit -m "feat: add Billing item to student sidebar nav"
```

---

## Task 9: User Billing Page + Components

**Files:**
- Create: `components/billing/VaultStatusCard.tsx`
- Create: `components/billing/PaymentHistoryTable.tsx`
- Create: `components/billing/SubscribeButton.tsx`
- Create: `app/[locale]/learn/dashboard/billing/page.tsx`

**Step 1: Create SubscribeButton**

File: `components/billing/SubscribeButton.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function SubscribeButton() {
  const t = useTranslations('billing');
  const locale = useLocale();
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      console.error('Subscribe failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="gold" onClick={handleSubscribe} disabled={loading}>
      {loading ? '...' : t('subscribe_vault')}
    </Button>
  );
}
```

**Step 2: Create VaultStatusCard**

File: `components/billing/VaultStatusCard.tsx`

This is a server-rendered card that shows subscription state. It receives data as props from the page.

```typescript
'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SubscribeButton } from './SubscribeButton';

type VaultStatusCardProps = {
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  vaultSource: 'subscription' | 'enrollment' | null;
  activeCourseName: string | null;
  hasAccess: boolean;
};

export function VaultStatusCard({
  subscriptionStatus,
  subscriptionExpiresAt,
  vaultSource,
  activeCourseName,
  hasAccess,
}: VaultStatusCardProps) {
  const t = useTranslations('billing');
  const locale = useLocale();
  const [portalLoading, setPortalLoading] = useState(false);

  async function handleManage() {
    setPortalLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      console.error('Portal redirect failed:', err);
    } finally {
      setPortalLoading(false);
    }
  }

  const nextBillingFormatted = subscriptionExpiresAt
    ? new Date(subscriptionExpiresAt).toLocaleDateString(
        locale === 'ja' ? 'ja-JP' : 'en-US',
        { month: 'long', day: 'numeric', year: 'numeric' },
      )
    : null;

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
      <h2 className="text-lg font-serif text-fg-primary mb-4">{t('vault_status')}</h2>

      {vaultSource === 'subscription' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-accent-teal/15 text-accent-teal">
              {t('vault_active')}
            </span>
          </div>
          {nextBillingFormatted && (
            <p className="text-sm text-fg-secondary">
              {t('next_billing', { date: nextBillingFormatted })}
            </p>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleManage}
            disabled={portalLoading}
          >
            {portalLoading ? '...' : t('manage_subscription')}
          </Button>
        </div>
      )}

      {vaultSource === 'enrollment' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-accent-gold/15 text-accent-gold">
              {t('vault_included', { courseName: activeCourseName ?? '' })}
            </span>
          </div>
          <p className="text-sm text-fg-tertiary">
            {t('vault_pitch')}
          </p>
        </div>
      )}

      {!hasAccess && (
        <div className="space-y-3">
          <p className="text-sm text-fg-secondary">{t('vault_pitch')}</p>
          <SubscribeButton />
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create PaymentHistoryTable**

File: `components/billing/PaymentHistoryTable.tsx`

```typescript
import { useTranslations, useLocale } from 'next-intl';
import type { Payment } from '@/lib/payments/types';

type PaymentHistoryTableProps = {
  payments: Payment[];
};

export function PaymentHistoryTable({ payments }: PaymentHistoryTableProps) {
  const t = useTranslations('billing');
  const locale = useLocale();

  function formatAmount(amount: number, currency: string): string {
    if (currency === 'jpy') {
      return `¥${amount.toLocaleString()}`;
    }
    return `$${(amount / 100).toFixed(2)}`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(
      locale === 'ja' ? 'ja-JP' : 'en-US',
      { month: 'short', day: 'numeric', year: 'numeric' },
    );
  }

  if (payments.length === 0) {
    return (
      <p className="text-sm text-fg-tertiary py-4">{t('no_payments')}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-default text-fg-tertiary text-left">
            <th className="py-2 pr-4 font-medium">Date</th>
            <th className="py-2 pr-4 font-medium">Description</th>
            <th className="py-2 pr-4 font-medium text-right">Amount</th>
            <th className="py-2 font-medium text-right">Receipt</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="border-b border-border-default/50">
              <td className="py-3 pr-4 text-fg-secondary">{formatDate(payment.created_at)}</td>
              <td className="py-3 pr-4 text-fg-primary">
                {payment.description ?? t(payment.type)}
              </td>
              <td className="py-3 pr-4 text-fg-primary text-right font-medium">
                {formatAmount(payment.amount, payment.currency)}
              </td>
              <td className="py-3 text-right">
                {payment.receipt_url ? (
                  <a
                    href={payment.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-teal hover:underline"
                  >
                    {t('receipt')}
                  </a>
                ) : (
                  <span className="text-fg-tertiary">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 4: Create the billing page**

File: `app/[locale]/learn/dashboard/billing/page.tsx`

```typescript
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getUserPayments } from '@/lib/payments/queries';
import { checkVaultAccess } from '@/lib/vault/access';
import { VaultStatusCard } from '@/components/billing/VaultStatusCard';
import { PaymentHistoryTable } from '@/components/billing/PaymentHistoryTable';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata() {
  return { title: 'Billing — Dashboard' };
}

export default async function BillingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(`${prefix}/learn/auth`);
  }

  const t = await getTranslations('billing');

  // Fetch user subscription data
  const { data: profile } = await supabase
    .from('users')
    .select('subscription_status, subscription_expires_at')
    .eq('id', user.id)
    .single();

  const vaultAccess = await checkVaultAccess(user.id);
  const payments = await getUserPayments(user.id);

  return (
    <div className="space-y-8 max-w-[880px]">
      <h1 className="text-2xl font-serif text-fg-primary">{t('title')}</h1>

      <VaultStatusCard
        subscriptionStatus={profile?.subscription_status ?? 'none'}
        subscriptionExpiresAt={profile?.subscription_expires_at ?? null}
        vaultSource={vaultAccess.source}
        activeCourseName={vaultAccess.activeCourseName}
        hasAccess={vaultAccess.hasAccess}
      />

      <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
        <h2 className="text-lg font-serif text-fg-primary mb-4">{t('payment_history')}</h2>
        <PaymentHistoryTable payments={payments} />
      </div>
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add components/billing/ app/[locale]/learn/dashboard/billing/
git commit -m "feat: add user billing page with vault status and payment history"
```

---

## Task 10: Admin Nav — Add Revenue Item

**Files:**
- Modify: `components/admin/AdminNav.tsx`

**Step 1: Add DollarSign import and revenue nav item**

In `components/admin/AdminNav.tsx`, add `DollarSign` to the lucide-react import:

```typescript
import { LayoutDashboard, BookOpen, GraduationCap, Library, Users, FileText, DollarSign } from 'lucide-react';
```

Add revenue item to `navItems` array after Applications:

```typescript
  { href: '/admin/applications', label: 'Applications', icon: FileText },
  { href: '/admin/revenue', label: 'Revenue', icon: DollarSign },
```

**Step 2: Commit**

```bash
git add components/admin/AdminNav.tsx
git commit -m "feat: add Revenue item to admin sidebar nav"
```

---

## Task 11: Admin Revenue Queries

**Files:**
- Modify: `lib/admin/queries.ts`
- Modify: `lib/admin/types.ts`

**Step 1: Add types to `lib/admin/types.ts`**

```typescript
export interface RevenueStats {
  total_usd: number;
  total_jpy: number;
  month_usd: number;
  month_jpy: number;
  active_subscribers: number;
  active_enrollments: number;
}

export interface TransactionRecord {
  id: string;
  user_name: string | null;
  user_email: string | null;
  type: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  receipt_url: string | null;
  created_at: string;
}
```

**Step 2: Add queries to `lib/admin/queries.ts`**

```typescript
export async function getRevenueStats(): Promise<RevenueStats> {
  const supabase = await createClient();

  // Total revenue by currency
  const { data: allPayments } = await supabase
    .from('payments')
    .select('amount, currency')
    .eq('status', 'succeeded');

  let total_usd = 0;
  let total_jpy = 0;
  for (const p of allPayments ?? []) {
    if (p.currency === 'usd') total_usd += p.amount;
    else if (p.currency === 'jpy') total_jpy += p.amount;
  }

  // This month's revenue
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: monthPayments } = await supabase
    .from('payments')
    .select('amount, currency')
    .eq('status', 'succeeded')
    .gte('created_at', monthStart.toISOString());

  let month_usd = 0;
  let month_jpy = 0;
  for (const p of monthPayments ?? []) {
    if (p.currency === 'usd') month_usd += p.amount;
    else if (p.currency === 'jpy') month_jpy += p.amount;
  }

  // Active subscribers
  const { count: active_subscribers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_status', 'active');

  // Active enrollments
  const { count: active_enrollments } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  return {
    total_usd,
    total_jpy,
    month_usd,
    month_jpy,
    active_subscribers: active_subscribers ?? 0,
    active_enrollments: active_enrollments ?? 0,
  };
}

export async function getTransactions(): Promise<TransactionRecord[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payments')
    .select('*, user:users(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return (data ?? []).map((p) => {
    const user = p.user as unknown as { full_name: string | null; email: string | null } | null;
    return {
      id: p.id,
      user_name: user?.full_name ?? null,
      user_email: user?.email ?? null,
      type: p.type,
      description: p.description,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      receipt_url: p.receipt_url,
      created_at: p.created_at,
    };
  });
}
```

**Step 3: Commit**

```bash
git add lib/admin/queries.ts lib/admin/types.ts
git commit -m "feat: add revenue stats and transaction queries for admin"
```

---

## Task 12: Admin Revenue Dashboard Page

**Files:**
- Create: `app/[locale]/admin/revenue/page.tsx`

**Step 1: Create the revenue page**

File: `app/[locale]/admin/revenue/page.tsx`

```typescript
import { setRequestLocale } from 'next-intl/server';
import { getRevenueStats, getTransactions } from '@/lib/admin/queries';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Revenue — Admin',
};

export default async function AdminRevenuePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const stats = await getRevenueStats();
  const transactions = await getTransactions();

  function formatUsd(cents: number): string {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }

  function formatJpy(yen: number): string {
    return `¥${yen.toLocaleString('ja-JP')}`;
  }

  return (
    <div className="space-y-6 max-w-[1100px]">
      <h1 className="text-2xl font-serif text-fg-primary">Revenue</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
          <p className="text-xs text-fg-tertiary uppercase tracking-wider mb-1">Total USD</p>
          <p className="text-xl font-semibold text-fg-primary">{formatUsd(stats.total_usd)}</p>
          <p className="text-xs text-fg-tertiary mt-1">This month: {formatUsd(stats.month_usd)}</p>
        </div>
        <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
          <p className="text-xs text-fg-tertiary uppercase tracking-wider mb-1">Total JPY</p>
          <p className="text-xl font-semibold text-fg-primary">{formatJpy(stats.total_jpy)}</p>
          <p className="text-xs text-fg-tertiary mt-1">This month: {formatJpy(stats.month_jpy)}</p>
        </div>
        <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
          <p className="text-xs text-fg-tertiary uppercase tracking-wider mb-1">Active Subscribers</p>
          <p className="text-xl font-semibold text-accent-gold">{stats.active_subscribers}</p>
        </div>
        <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
          <p className="text-xs text-fg-tertiary uppercase tracking-wider mb-1">Active Enrollments</p>
          <p className="text-xl font-semibold text-accent-teal">{stats.active_enrollments}</p>
        </div>
      </div>

      {/* Transactions table */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
        <h2 className="text-lg font-serif text-fg-primary mb-4">Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-fg-tertiary">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default text-fg-tertiary text-left">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">User</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Description</th>
                  <th className="py-2 pr-4 font-medium text-right">Amount</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border-default/50">
                    <td className="py-3 pr-4 text-fg-secondary">
                      {new Date(tx.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="text-fg-primary">{tx.user_name ?? '—'}</div>
                      <div className="text-xs text-fg-tertiary">{tx.user_email}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={cn(
                        'inline-block px-2 py-0.5 text-xs font-medium rounded-full',
                        tx.type === 'course_purchase'
                          ? 'bg-accent-teal/15 text-accent-teal'
                          : 'bg-accent-gold/15 text-accent-gold',
                      )}>
                        {tx.type === 'course_purchase' ? 'Course' : 'Vault'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-fg-secondary">{tx.description ?? '—'}</td>
                    <td className="py-3 pr-4 text-fg-primary text-right font-medium">
                      {tx.currency === 'jpy'
                        ? formatJpy(tx.amount)
                        : formatUsd(tx.amount)}
                    </td>
                    <td className="py-3">
                      <span className={cn(
                        'text-xs',
                        tx.status === 'succeeded' ? 'text-green-400' : 'text-red-400',
                      )}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

Note: Add `import { cn } from '@/lib/utils';` at top.

**Step 2: Commit**

```bash
git add app/[locale]/admin/revenue/
git commit -m "feat: add admin revenue dashboard page"
```

---

## Task 13: Enhanced Admin Student List

**Files:**
- Modify: `lib/admin/queries.ts` — update `getStudentList()` to include subscription data
- Modify: `lib/admin/types.ts` — update `StudentListItem`

**Step 1: Update `StudentListItem` type**

Add to `StudentListItem` in `lib/admin/types.ts`:

```typescript
export interface StudentListItem {
  id: string;
  email: string | null;
  full_name: string | null;
  enrolled_courses: string[];
  subscription_status: string;
  subscription_tier: string;
  created_at: string;
}
```

**Step 2: Update `getStudentList()` query**

In `lib/admin/queries.ts`, modify the select to include subscription fields:

```typescript
  const { data: students, error } = await supabase
    .from('users')
    .select('id, email, full_name, subscription_status, subscription_tier, created_at')
    .eq('role', 'student')
    .order('created_at', { ascending: false });
```

And update the return mapping to include:

```typescript
  return (students ?? []).map((s) => ({
    id: s.id,
    email: s.email,
    full_name: s.full_name,
    enrolled_courses: enrollmentMap.get(s.id) ?? [],
    subscription_status: s.subscription_status ?? 'none',
    subscription_tier: s.subscription_tier ?? 'free',
    created_at: s.created_at,
  }));
```

**Step 3: Update `AdminStudentList` component to display new columns**

In the student list component, add Subscription Status and Vault Access columns. The exact component file is `components/admin/AdminStudentList.tsx`.

**Step 4: Commit**

```bash
git add lib/admin/queries.ts lib/admin/types.ts components/admin/AdminStudentList.tsx
git commit -m "feat: add subscription status to admin student list"
```

---

## Task 14: Build Verification

**Step 1: Run build**

```bash
npm run build
```

Expected: Build succeeds with no type errors. New routes visible:
- `/api/stripe/subscribe`
- `/api/stripe/portal`
- `/[locale]/learn/dashboard/billing`
- `/[locale]/admin/revenue`

**Step 2: Manual testing checklist**

1. Navigate to `/learn/dashboard/billing` — page renders with "Not Subscribed" state
2. Navigate to `/admin/revenue` — page renders with zero stats
3. Sidebar nav shows "Billing" item in student dashboard
4. Sidebar nav shows "Revenue" item in admin dashboard
5. Subscribe button calls `/api/stripe/subscribe` (will fail without Stripe Price IDs — expected)
6. Course purchase creates entry in `payments` table
7. Stripe CLI webhook forwarding works for subscription events

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete payments, subscriptions and admin revenue system"
```

---

## Pre-Implementation Checklist

Before starting, the user needs to:

1. **Create Stripe Product + Prices** in Stripe Dashboard:
   - Product: "The Vault"
   - Price 1: $50.00/month USD recurring
   - Price 2: ¥7,500/month JPY recurring
2. **Copy Price IDs** to `.env.local`:
   - `STRIPE_VAULT_PRICE_USD=price_xxx`
   - `STRIPE_VAULT_PRICE_JPY=price_yyy`
3. **Configure Stripe Customer Portal** in Stripe Dashboard (Settings → Customer Portal) — enable cancellation and payment method updates
4. **Run the database migration** (Task 1) before testing any features
5. **Ensure Stripe CLI is running** for webhook testing:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

Plan complete and saved to `docs/plans/2026-03-02-payments-subscriptions-admin.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

Which approach?

<function_calls>
<invoke name="AskUserQuestion">
<parameter name="questions">[{"question": "How would you like to execute this 14-task implementation plan?", "header": "Execution", "options": [{"label": "Subagent-Driven (this session)", "description": "I dispatch a fresh subagent per task right here, review between tasks. Faster iteration, you can course-correct as we go."}, {"label": "Parallel Session (separate)", "description": "You open a new Claude session in a worktree and use executing-plans to batch through tasks with checkpoints. Better for large uninterrupted runs."}, {"label": "Just start building directly", "description": "Skip the subagent framework and implement tasks sequentially right here in this conversation."}], "multiSelect": false}]