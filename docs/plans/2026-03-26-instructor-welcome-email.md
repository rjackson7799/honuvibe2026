# Instructor Welcome & Onboarding Email

## Context

When an admin creates a new instructor via the AddInstructorFlow, the user account is created with `email_confirm: true` but **no password and no notification**. The instructor has no way to know they've been onboarded and no way to log in. Similarly, when an existing student is promoted to instructor, they receive no notification.

We need a branded welcome email sent via Resend with a secure login/password-setup link.

## Approach

Use Supabase Admin API's `generateLink()` to create secure action links, then send a branded email via the existing Resend infrastructure.

- **New users** → `generateLink({ type: 'invite', email })` → "Set Your Password" CTA
- **Promoted users** → `generateLink({ type: 'magiclink', email })` → "Log In to Your Dashboard" CTA

The admin gets a checkbox (default: checked) to control whether the email is sent.

## Files to Modify

### 1. `lib/email/types.ts` — Add data type

```ts
export interface InstructorWelcomeEmailData {
  locale: Locale;
  displayName: string;
  email: string;
  titleEn: string | null;
  titleJp: string | null;
  actionLink: string;
  type: 'new' | 'promoted';
}
```

### 2. `lib/email/send.ts` — Add two email functions

**`sendInstructorWelcomeEmail(data)`** — To instructor
- Subject: EN: "Welcome to the HonuVibe.AI Teaching Team!" / JP: "HonuVibe.AI 講師チームへようこそ！"
- Body: Congratulations banner, name/title details, CTA button
  - New: "Set Your Password" button → invite link (24h expiry noted)
  - Promoted: "Log In to Your Dashboard" button → magic link
- Follow existing `sendEnrollmentConfirmation` pattern

**`sendInstructorWelcomeAdminNotification(data)`** — To admin
- Subject: "New Instructor Onboarded: {name}"
- Brief summary: name, email, type (new/promoted), email sent status

### 3. `lib/instructors/actions.ts` — Add email sending after creation

Add a new server action:

```ts
export async function sendInstructorWelcomeEmailAction(
  email: string,
  displayName: string,
  titleEn: string | null,
  titleJp: string | null,
  type: 'new' | 'promoted',
  locale: 'en' | 'ja',
): Promise<{ success: boolean; error?: string }>
```

This action:
1. Calls `requireAdmin()`
2. Creates admin client and calls `generateLink({ type: type === 'new' ? 'invite' : 'magiclink', email, options: { redirectTo } })`
3. Constructs the proper callback URL from the returned `properties.action_link` (extracting the token and building the redirect through `/api/auth/callback`)
4. Calls `sendInstructorWelcomeEmail()` and `sendInstructorWelcomeAdminNotification()`
5. Returns success/error — failures never throw, just return `{ success: false }`

Keeping this as a **separate action** (not embedded in `createNewUserAndInstructor`) keeps the creation logic clean and lets the UI call it independently after creation succeeds.

### 4. `components/admin/AddInstructorFlow.tsx` — Add checkbox + trigger email

**Step 2 (Profile form):**
- Add state: `sendWelcome` (default: `true`), `emailLocale` (default: `'en'`)
- Add checkbox at bottom of form: "Send welcome email with login link"
- Add small EN/JP toggle next to checkbox for email language

**`handleCreate` function:**
- After successful creation (`setStep('done')`), if `sendWelcome` is true, call `sendInstructorWelcomeEmailAction()` in background
- Store email send result in state

**Step 3 (Done screen):**
- Show email status: "Welcome email sent" with checkmark, or "Email not sent" if skipped/failed
- If email failed, show a "Resend Welcome Email" button that calls the action again

## Auth Callback Flow (no changes needed)

The existing `/api/auth/callback/route.ts` already handles invite and magiclink tokens:
1. Instructor clicks link in email
2. Supabase redirects to `/api/auth/callback?code=...`
3. Callback exchanges code for session
4. For invite links: detects recovery session, redirects to `/learn/auth/reset` to set password
5. For magic links: redirects to `/learn/dashboard`

## Verification

1. **New instructor flow**: Create instructor with email ON → check Resend dashboard for delivery → click "Set Your Password" → land on reset page → set password → log in
2. **Promote flow**: Promote existing user with email ON → check for delivery → click "Log In" → land on dashboard
3. **Email OFF**: Uncheck toggle → create → no email sent, creation still succeeds
4. **Resend button**: If email fails, click Resend on success screen → verify retry works
5. **JP locale**: Toggle to JP → verify email content is Japanese
