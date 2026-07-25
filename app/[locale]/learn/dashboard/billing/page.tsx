import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getUserPayments } from '@/lib/payments/queries';
import { checkVaultAccess } from '@/lib/vault/access';
import { VaultStatusCard } from '@/components/billing/VaultStatusCard';
import { PaymentHistoryTable } from '@/components/billing/PaymentHistoryTable';
import { Card } from '@/components/ui/card';
import { SectionHeading } from '@/components/learn/SectionHeading';
import { CreditCard } from 'lucide-react';
import { DashboardPageHeader } from '@/components/learn/DashboardPageHeader';

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
    .select('subscription_status, subscription_expires_at, stripe_customer_id')
    .eq('id', user.id)
    .single();

  const vaultAccess = await checkVaultAccess(user.id);
  const payments = await getUserPayments(user.id);

  // Sponsor label for a partner-seat account. JP falls back to the EN name when
  // the partner has no name_jp.
  const sponsorName =
    locale === 'ja'
      ? (vaultAccess.sponsor?.nameJp ?? vaultAccess.sponsor?.nameEn ?? null)
      : (vaultAccess.sponsor?.nameEn ?? null);

  return (
    <div className="space-y-6 max-w-[880px]">
      <DashboardPageHeader icon={CreditCard} title={t('title')} />

      <VaultStatusCard
        subscriptionStatus={profile?.subscription_status ?? 'none'}
        subscriptionExpiresAt={profile?.subscription_expires_at ?? null}
        vaultSource={vaultAccess.source}
        activeCourseName={vaultAccess.activeCourseName}
        hasAccess={vaultAccess.hasAccess}
        hasBillingAccount={Boolean(profile?.stripe_customer_id)}
        sponsorName={sponsorName}
        sponsorAccessEndsAt={vaultAccess.sponsor?.accessEndsAt ?? null}
      />

      <Card variant="learn" padding="lg">
        <SectionHeading title={t('payment_history')} bordered />
        <PaymentHistoryTable payments={payments} />
      </Card>
    </div>
  );
}
