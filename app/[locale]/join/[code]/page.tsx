import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { JoinShell, type JoinPartnerBrand } from '@/components/join/join-shell';
import { JoinAction } from '@/components/join/join-action';
import { Button } from '@/components/ui/button';
import { normalizeJoinCode } from '@/lib/partners/join';

type Props = {
  params: Promise<{ locale: string; code: string }>;
};

// Bearer credential in the URL: never prerender, never cache. The no-store /
// no-referrer / noindex headers are set for /join/* in next.config.ts.
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return { title: 'Join — HonuVibe', robots: { index: false, follow: false } };
}

/**
 * Partner join-code entry page.
 *
 * Lookup runs through the service role because `partner_join_codes` is not
 * readable by anon. Any failure — malformed code, unknown code, deactivated
 * code, inactive partner — renders the SAME generic message, so the page never
 * confirms whether a code or a partner exists.
 *
 * Nothing is mutated here. Redemption happens only on the authenticated POST
 * behind the CTA.
 */
export default async function JoinCodePage({ params }: Props) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'join' });
  const prefix = locale === 'ja' ? '/ja' : '';
  const normalized = normalizeJoinCode(decodeURIComponent(code));

  const invalidCard = (
    <JoinShell
      partner={null}
      overline={t('overline')}
      title={t('invalid_title')}
      body={t('invalid_body')}
    >
      <Button variant="ghost" size="md" href={`${prefix}/learn`}>
        {t('browse_courses')}
      </Button>
    </JoinShell>
  );

  if (!normalized) return invalidCard;

  const admin = createAdminClient();
  const { data: codeRow } = await admin
    .from('partner_join_codes')
    .select('id, partner_id, is_active, expires_at, seat_block_id')
    .eq('code', normalized)
    .maybeSingle();

  if (!codeRow || !codeRow.is_active) return invalidCard;

  const { data: partnerRow } = await admin
    .from('partners')
    .select('slug, name_en, name_jp, logo_url, primary_color, is_active')
    .eq('id', codeRow.partner_id)
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
    codeRow.expires_at !== null && new Date(codeRow.expires_at) <= new Date();

  if (isExpired) {
    return (
      <JoinShell
        partner={partner}
        overline={t('overline')}
        title={t('expired_title')}
        body={t('outcome_expired')}
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

  const returnPath = `${prefix}/join/${normalized}`;
  const authHref = `${prefix}/learn/auth?redirect=${encodeURIComponent(returnPath)}`;

  return (
    <JoinShell
      partner={partner}
      overline={t('overline')}
      title={t('title', { partner: partner.name })}
      body={codeRow.seat_block_id ? t('body_sponsored') : t('body')}
    >
      {user ? (
        <JoinAction
          kind="code"
          credential={normalized}
          ctaLabel={t('cta_join', { partner: partner.name })}
          dashboardHref={`${prefix}/learn/dashboard`}
          authHref={authHref}
        />
      ) : (
        <>
          <Button variant="primary" size="md" href={authHref} fullWidth>
            {t('cta_sign_in')}
          </Button>
          <p className="text-xs text-fg-tertiary">{t('sign_in_hint')}</p>
        </>
      )}
    </JoinShell>
  );
}
