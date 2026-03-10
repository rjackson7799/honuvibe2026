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
