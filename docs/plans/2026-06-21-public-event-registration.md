# Public Event Registration — Plan v3 (implementation-ready)

> **Status:** v1 was built but has the gaps from the first two reviews. v3 resolves the remaining
> strategy gaps (confirmation deadline, upsert transitions, function hardening, durable abuse
> protection, email recovery, lifecycle lookup, retention mechanism). **Hold for go-ahead before
> implementing.** v3 supersedes v1/v2 and patches the existing files.

## Context

Public, bilingual event registration. **Layout:** Option A split-screen (reuses the `/learn/auth`
shell). **Model:** capture real registrations (name + email + referral) with an enforced seat cap,
admin view, transactional email — a deliberate, controlled reversal of the prior privacy-first
model, with the PII controls below. **Seat model:** confirm-to-hold (double opt-in) — a seat is
consumed only after the registrant confirms via an emailed link.

## Lifecycle lookup (resolved)
Split "featured" from "routable":
- `active` on `PublicEvent` means **featured in the site-wide strip** only — `featuredEvent()` keeps
  using it.
- Add `publicEventBySlug(slug)` returning **any known event regardless of `active`** (routable).
  Past/inactive events render in a **closed state**, not 404.
- Registration windows: `registrationOpensAt?` (default: open), `registrationClosesAt?` (default
  `startsAt`). Page states: *open* / *registration closed* (past close, before/after start) /
  *full*. Submission rejected outside the open window.

## Data model

**`PublicEvent`** ([lib/events/public-events.ts](../../lib/events/public-events.ts)): add
`meetingUrl?`, `registrationClosesAt?` (default `startsAt`). (`endsAt`, `format`, `capacity`,
presenter fields, `learnPoints` already present.)

**`event_rsvps`** (amend the unapplied migration `048`):
- `status`: `pending | confirmed | attended | no_show | cancelled`, default **`pending`**.
- add `confirmed_at timestamptz`, `confirm_token uuid UNIQUE DEFAULT gen_random_uuid()`,
  `confirm_deadline timestamptz NOT NULL` (= `startsAt` at insert — the confirmation cutoff),
  `event_ends_at timestamptz` (denormalized, for retention), `newsletter_opt_in boolean DEFAULT false`,
  `last_email_status text`, `last_email_error text`, `last_confirm_email_at timestamptz`.
- `unique(event_slug, lower(email))` (dedup).
- **Seat-consuming statuses:** `confirmed | attended | no_show`. `pending`/`cancelled` never count.
- Indexes: `(status, event_ends_at)` and `(status, created_at)` for the retention jobs;
  `(event_slug, status)` for capacity counts.

## Confirmation deadline (resolved)
A seat may be confirmed only while `now() <= confirm_deadline` (= event start). So even if someone
submits just before `registrationClosesAt`, their confirm link dies at start. Enforced **inside**
`claim_event_seat` (returns `expired`), not just in app code.

## Atomic reservation function (hardened — release-blocker)
`public.claim_event_seat(p_slug text, p_token uuid, p_capacity int) RETURNS text`,
`SECURITY DEFINER`, with:
- `SET search_path = ''` (all refs schema-qualified).
- `REVOKE ALL ... FROM PUBLIC, anon, authenticated;` `GRANT EXECUTE ... TO service_role;`
- validate `p_capacity > 0` (raise otherwise).
- look up the row by `confirm_token` **and** `event_slug = p_slug` (token must match the route's
  slug — rejects cross-event tokens) → else `not_found`.
- order: `pg_advisory_xact_lock(hashtext(p_slug))` first → re-read row `FOR UPDATE` → checks.
- returns: `not_found | expired | cancelled | full | confirmed` (idempotent: an already
  confirmed/attended/no_show row returns `confirmed` without recount — fixes duplicate-vs-full).
- only transitions `pending → confirmed` when `count(consuming) < p_capacity`.

## Upsert state transitions (resolved)
Submit (`POST /api/events/rsvp`) upserts by `(event_slug, lower(email))`:
| Existing row | Action |
|---|---|
| none | insert `pending`; mint `confirm_token`; set `confirm_deadline`, `event_ends_at`, `newsletter_opt_in`; send confirm email |
| `pending` | keep `pending`; **rotate `confirm_token`** (newest link wins); refresh deadline; **OR-merge** `newsletter_opt_in` (never downgrade consent); resend confirm email |
| `confirmed`/`attended`/`no_show` | **no status change** (no downgrade); idempotent success; OR-merge newsletter consent; do **not** rotate token; optional receipt resend |
| `cancelled` | reactivate to `pending` (new token + deadline); OR-merge consent; resend confirm email |

## Abuse protection (resolved — durable without new infra)
Layered, strongest layer needs no Redis:
1. **Per-email durable throttle (DB):** reject a resend if `last_confirm_email_at` is within N
   minutes (e.g., 2) — stops confirm-email bombing of a victim address; survives across instances
   because it lives in Postgres.
2. **Per-IP instance-local** `tryConsume` ([lib/community/rate-limit.ts](../../lib/community/rate-limit.ts))
   as a cheap first layer (acknowledged best-effort per instance).
3. **Honeypot** field (empty-or-bust), matching [free-lesson/subscribe](../../app/api/free-lesson/subscribe/route.ts).
4. Confirm-to-hold already blunts seat-exhaustion (pending never consumes a seat).
- *Optional production upgrade (flagged, infra cost):* durable per-IP limits via Upstash Redis
  (Vercel Marketplace) — add only if abuse appears; not required for launch given layers 1+4.

## Email reliability & recovery (resolved)
- Send via `after()` (`next/server`) — no premature termination.
- **Recovery = resubmission** (explicitly the retry path): no email → user resubmits → token
  rotates → fresh confirm email. Document this in the UI ("didn't get it? submit again").
- Record `last_email_status` / `last_email_error` for observability.
- **Admin "resend confirmation"** action (fast-follow; the invite-only layer already has a resend
  pattern to mirror).

## Flow & responses (contradiction resolved)
- **Submit** → `{ success: true, pending: true }` (no `seatsLeft` — no seat is held yet; the
  page's dynamic server count is the display source of truth). UI: "check your email to confirm
  your seat."
- **Confirm** `GET /events/[slug]/confirm?token=…` (dynamic) → `claim_event_seat` → render
  `confirmed` (show join link + `.ics`) / `full` / `expired` / `cancelled`. This is the
  authoritative seat outcome.
- **Full** → newsletter opt-in capture only. **No waitlist** (pending rows are *not* a waitlist;
  no separate waitlist data/consent flow in scope) — stated explicitly to remove ambiguity.

## Freshness
Event page `export const dynamic = 'force-dynamic'`; seats-left = `capacity − count(consuming)`
per request. Form closed (with messaging) when full or outside the registration window.

## Retention (resolved — pg_cron)
- **Mechanism: `pg_cron`** (self-contained in the DB; schedule defined in the migration, applied
  manually per the prod-migration flow — no app endpoint/secret).
- Rules:
  - `DELETE WHERE event_ends_at < now() - interval '90 days'` — confirmed/attended/no_show/**cancelled**.
  - `DELETE WHERE status = 'pending' AND created_at < now() - interval '7 days'` — abandoned pending.
- Indexes `(status, event_ends_at)` + `(status, created_at)` support both.
- Consent copy on the form; newsletter opt-in separate (lives in Beehiiv). Admin **delete** action
  for APPI/GDPR requests. Plausible counts are non-PII and survive deletion.

## Admin
[admin/event-registrations](../../app/[locale]/admin/event-registrations/page.tsx) +
[list](../../components/admin/AdminEventRsvpList.tsx): show status, confirmed-vs-capacity, last
email status; add **delete** + **resend confirmation** actions. Service-role reads; admin RLS.

## v1 cleanup
Repoint/remove orphaned [PublicEventRsvp](../../components/events/PublicEventRsvp.tsx) + strip CTA
wording; **fail closed** (clear message) when the service-role key is absent; announce
success/full/closed state changes for a11y.

## Verification
- `pnpm type-check`; build on Vercel/higher-RAM (local Turbopack OOMs).
- **Automated tests:** concurrent final-seat (no oversubscribe), duplicate-at-capacity →
  idempotent `confirmed`, cancelled/pending excluded from count, expired confirm (past deadline),
  registration-closed/past event still routable, DB + email failure, per-email throttle + honeypot,
  admin authorization. **Explicit RLS test** for `event_rsvps` (anon denied; admin allowed) and
  that `claim_event_seat` is not executable by anon/authenticated.
- Apply `048` in the Supabase dashboard (manual). `pnpm test:rls` needs the 022/025 workaround.
```sql
-- claim_event_seat sketch (advisory lock → deadline → idempotency → atomic count→confirm)
CREATE OR REPLACE FUNCTION public.claim_event_seat(p_slug text, p_token uuid, p_capacity int)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.event_rsvps; n int;
BEGIN
  IF p_capacity <= 0 THEN RAISE EXCEPTION 'capacity must be positive'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_slug));
  SELECT * INTO r FROM public.event_rsvps
    WHERE confirm_token = p_token AND event_slug = p_slug FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF r.status IN ('confirmed','attended','no_show') THEN RETURN 'confirmed'; END IF;
  IF r.status = 'cancelled' THEN RETURN 'cancelled'; END IF;
  IF pg_catalog.now() > r.confirm_deadline THEN RETURN 'expired'; END IF;
  SELECT pg_catalog.count(*) INTO n FROM public.event_rsvps
    WHERE event_slug = p_slug AND status IN ('confirmed','attended','no_show');
  IF n >= p_capacity THEN RETURN 'full'; END IF;
  UPDATE public.event_rsvps SET status='confirmed', confirmed_at=pg_catalog.now() WHERE id = r.id;
  RETURN 'confirmed';
END $$;
REVOKE ALL ON FUNCTION public.claim_event_seat(text,uuid,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_event_seat(text,uuid,int) TO service_role;
```
