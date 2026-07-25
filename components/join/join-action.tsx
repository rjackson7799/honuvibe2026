'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { isJoinOutcome, type JoinOutcome } from '@/lib/partners/join';

type JoinActionProps = {
  /** Which entry path this is — decides the endpoint and the request body. */
  kind: 'code' | 'invite';
  /** Normalized join code, or the raw invite token. Never logged. */
  credential: string;
  ctaLabel: string;
  dashboardHref: string;
  /** Where to send the user if the session expired between render and click. */
  authHref: string;
};

/**
 * The authenticated half of a join page: one explicit click that POSTs to the
 * server, which authenticates the session and calls the RPC with the
 * SERVER-derived user id.
 *
 * A GET on the invite page must never consume the invite (email scanners and
 * link prefetchers follow GETs), which is exactly why acceptance lives behind
 * this button and not in the page's data fetch.
 */
export function JoinAction({
  kind,
  credential,
  ctaLabel,
  dashboardHref,
  authHref,
}: JoinActionProps) {
  const t = useTranslations('join');
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<JoinOutcome | null>(null);
  const [failed, setFailed] = useState<'generic' | 'rate_limited' | null>(null);

  async function submit() {
    setPending(true);
    setFailed(null);
    try {
      const endpoint = kind === 'code' ? '/api/join/redeem' : '/api/join/accept-invite';
      const body = kind === 'code' ? { code: credential } : { token: credential };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as
        | { outcome?: unknown }
        | null;

      if (res.status === 401) {
        router.push(authHref);
        return;
      }
      if (res.status === 429) {
        setOutcome(null);
        setFailed('rate_limited');
        return;
      }
      if (!isJoinOutcome(data?.outcome)) {
        setFailed('generic');
        return;
      }

      // A clean join (or a repeat click by an existing member) has nothing more
      // to say — send them straight on, preserving the locale.
      if (data.outcome === 'joined' || data.outcome === 'already_member') {
        router.push(dashboardHref);
        return;
      }

      // joined_no_seat / seat_revoked_previously are successes with a caveat the
      // member needs to read, so they stay on the page with a Continue link.
      setOutcome(data.outcome);
    } catch {
      setFailed('generic');
    } finally {
      setPending(false);
    }
  }

  if (failed) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[color:var(--accent-coral)]">
          {failed === 'rate_limited' ? t('error_rate_limited') : t('error_generic')}
        </p>
        <Button variant="ghost" size="sm" onClick={() => void submit()} disabled={pending}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  if (outcome) {
    const succeeded = outcome === 'joined_no_seat' || outcome === 'seat_revoked_previously';
    return (
      <div className="space-y-3">
        <p className="text-[15px] leading-[1.7] text-fg-secondary">
          {t(`outcome_${outcome}`)}
        </p>
        {succeeded && (
          <Button variant="primary" size="md" href={dashboardHref}>
            {t('continue_to_dashboard')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="primary"
      size="md"
      onClick={() => void submit()}
      disabled={pending}
      fullWidth
    >
      {pending ? t('joining') : ctaLabel}
    </Button>
  );
}
