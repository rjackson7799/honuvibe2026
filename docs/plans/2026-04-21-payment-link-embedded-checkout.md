# Payment Link → Embedded Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the admin "Send Payment Link" email to link to the site's embedded Stripe checkout page instead of Stripe's hosted checkout.

**Architecture:** The embedded checkout page at `/learn/[slug]/checkout` already exists and works for normal enrollment flow. The send-payment-link API currently creates a Stripe hosted session (`ui_mode: 'payment'`) and emails `session.url` directly. We simply remove that session creation and replace `session.url` with the local checkout URL. No new files needed.

**Tech Stack:** Next.js App Router, Stripe (server-side, `stripe` v20), existing `sendLocalizedPaymentLinkEmail`

---

## Files Modified

- Modify: `app/api/admin/stripe/send-payment-link/route.ts` — remove Stripe session creation, replace with checkout page URL

---

### Task 1: Replace Stripe session creation with checkout page URL

**Files:**
- Modify: `app/api/admin/stripe/send-payment-link/route.ts`

- [ ] **Step 1: Open the file and locate the Stripe session block**

  Lines 72–103 in `app/api/admin/stripe/send-payment-link/route.ts`. The block creates a Stripe Checkout Session with `ui_mode: 'payment'` and passes `session.url` to the email function.

- [ ] **Step 2: Replace the Stripe session block**

  Delete lines 77–104 (the `stripe.checkout.sessions.create(...)` call and the `if (!session.url)` guard).
  
  Replace the removed `origin`, `isJapanese`, `localePrefix`, `courseTitle` setup + Stripe block with this leaner version:

  ```ts
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.honuvibe.ai';
  const isJapanese = locale === 'ja';
  const localePrefix = isJapanese ? '/ja' : '';
  const courseTitle = isJapanese && course.title_jp ? course.title_jp : course.title_en;
  const checkoutUrl = `${origin}${localePrefix}/learn/${course.slug}/checkout`;
  ```

  Then update the `sendLocalizedPaymentLinkEmail` call — change `paymentUrl: session.url` to `paymentUrl: checkoutUrl`.

  The final block (lines 72 onward) should look like:

  ```ts
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.honuvibe.ai';
  const isJapanese = locale === 'ja';
  const localePrefix = isJapanese ? '/ja' : '';
  const courseTitle = isJapanese && course.title_jp ? course.title_jp : course.title_en;
  const checkoutUrl = `${origin}${localePrefix}/learn/${course.slug}/checkout`;

  await sendLocalizedPaymentLinkEmail({
    locale,
    email: email.toLowerCase().trim(),
    fullName: targetUser.full_name ?? 'there',
    courseTitle,
    paymentUrl: checkoutUrl,
    priceUsd: course.price_usd,
  });

  return NextResponse.json({ success: true });
  ```

- [ ] **Step 3: Remove the unused `stripe` import**

  Line 2 imports `stripe` from `@/lib/stripe/client`. It's no longer used — delete that line.

  ```ts
  // Delete this line:
  import { stripe } from '@/lib/stripe/client';
  ```

- [ ] **Step 4: Verify the file compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors related to `send-payment-link/route.ts`.

- [ ] **Step 5: Commit**

  ```bash
  git add app/api/admin/stripe/send-payment-link/route.ts
  git commit -m "feat(admin): payment link email now links to embedded checkout page"
  ```

---

## Verification

1. Go to `honuvibe.ai/admin/courses/[any-published-course]` → Students tab
2. Enter a registered test user email, select EN, click **Send Link**
3. Admin UI shows "Payment link sent successfully (English)"
4. Check Resend: email delivered with subject "Complete your payment — {course title}"
5. Open the email → click "Complete Payment →"
6. Browser lands on `honuvibe.ai/learn/[slug]/checkout` with the embedded Stripe form visible (not on checkout.stripe.com)
7. Complete a test payment using Stripe card `4242 4242 4242 4242`
8. Verify redirect to `/learn/dashboard/[slug]?enrolled=true`
9. Check Supabase `enrollments` table: new active enrollment record created by webhook
