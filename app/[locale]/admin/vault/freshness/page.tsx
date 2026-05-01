import { setRequestLocale } from 'next-intl/server';
import { getVaultFreshnessQueue } from '@/lib/vault/queries';
import { VaultFreshnessQueue } from '@/components/admin/VaultFreshnessQueue';
import { VaultContentRequests } from '@/components/admin/VaultContentRequests';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Freshness Review — Admin',
};

export default async function AdminVaultFreshnessPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const items = await getVaultFreshnessQueue();

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div>
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
          Content Freshness Review
        </h1>
        <p className="text-sm text-fg-secondary mt-1.5">
          Content items flagged for review. Items are auto-flagged after 6 months without review.
        </p>
      </div>
      <VaultFreshnessQueue items={items} />
      <hr className="border-border-default" />
      <VaultContentRequests />
    </div>
  );
}
