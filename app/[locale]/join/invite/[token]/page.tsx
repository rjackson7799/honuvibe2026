import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { JoinShell, type JoinPartnerBrand } from '@/components/join/join-shell';
import { JoinAction } from '@/components/join/join-action';
import { Button } from '@/components/ui/button';
import { hashInviteToken, isPlausibleInviteToken, maskEmail } from '@/lib/partners/join';

type Props = {
  params: Promise<{ locale: string; token: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return { title: 'Invitation — HonuVibe', robots: { index: false, follow: false } };
}

/**
 * Partner invite entry page.
 *
 * The raw token stays in the URL and in this request only: it is hashed
 * server-side and never logged, persisted, or sent to analytics. THIS GET
 * RENDERS ONLY — acceptance requires the authenticated POST behind the CTA, so
 * an email scanner or link prefetcher can never burn an invite.
 */
export default async function JoinInvitePage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'join' });
  const prefix = locale === 'ja' ? '/ja' : '';
  const rawToken = decodeURIComponent(token);

  const invalidCard = (
    <JoinShell
      partner={null}
      overline={t('overline')}
      title={t('invite_invalid_title')}
      body={t('invite_invalid_body')}
    >
      <Button variant="ghost" size="md" href={`${prefix}/learn`}>
        {t('browse_courses')}
      </Button>
    </JoinShell>
  );

  if (!isPlausibleInviteToken(rawToken)) return invalidCard;

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from('partner_invites')
    .select('id, partner_id, email, status, expires_at, seat_block_id')
    .eq('token_hash', hashInviteToken(rawToken))
    .maybeSingle();

  // A revoked OR already-accepted invite is spent — never render an Accept CTA
  // for it. (The RPC refuses both too; this just avoids offering a dead button.)
  if (!invite || invite.status === 'revoked' || invite.status === 'accepted') {
    return invalidCard;
  }

  const { data: partnerRow } = await admin
    .from('partners')
    .select('slug, name_en, name_jp, logo_url, primary_color, is_active')
    .eq('id', invite.partner_id)
    .maybeSingle();

  if (!partnerRow || !partnerRow.is_active) return invalidCard;

  const partner: JoinPartnerBrand = {
    slug: partnerRow.slug,
    name:
      locale === 'ja'
        ? (partnerRow.name_jp ?? partnerRow.name_en)
        : partnerRow.name_en,
    logoUrl: partnerRow.logo_url ?? null,
    primaryColor: partnerRow.primary_color ?? null,
  };

  const isExpired =
    invite.status === 'expired' || new Date(invite.expires_at) <= new Date();

  if (isExpired) {
    return (
      <JoinShell
        partner={partner}
        overline={t('overline')}
        title={t('expired_title')}
        body={t('invite_expired_body')}
      >
        <Button variant="ghost" size="md" href={`${prefix}/learn`}>
          {t('browse_courses')}
        </Button>
      </JoinShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const returnPath = `${prefix}/join/invite/${rawToken}`;
  const authHref = `${prefix}/learn/auth?redirect=${encodeURIComponent(returnPath)}`;

  // Acceptance is bound to the invited address. Say so plainly rather than
  // letting the POST fail with a generic error.
  const signedInAs = user?.email?.trim().toLowerCase() ?? null;
  const wrongAccount = signedInAs !== null && signedInAs !== invite.email;

  if (wrongAccount) {
    return (
      <JoinShell
        partner={partner}
        overline={t('overline')}
        title={t('invite_wrong_account_title')}
        body={t('invite_wrong_account_body', { email: maskEmail(invite.email) })}
      >
        <Button variant="ghost" size="md" href={`${prefix}/learn/account`}>
          {t('invite_switch_account')}
        </Button>
      </JoinShell>
    );
  }

  return (
    <JoinShell
      partner={partner}
      overline={t('overline')}
      title={t('invite_title', { partner: partner.name })}
      body={invite.seat_block_id ? t('body_sponsored') : t('invite_body')}
    >
      {user ? (
        <JoinAction
          kind="invite"
          credential={rawToken}
          ctaLabel={t('invite_cta_accept')}
          dashboardHref={`${prefix}/learn/dashboard`}
          authHref={authHref}
        />
      ) : (
        <>
          <Button variant="primary" size="md" href={authHref} fullWidth>
            {t('cta_sign_in')}
          </Button>
          <p className="text-xs text-fg-tertiary">
            {t('invite_sign_in_hint', { email: maskEmail(invite.email) })}
          </p>
        </>
      )}
    </JoinShell>
  );
}
