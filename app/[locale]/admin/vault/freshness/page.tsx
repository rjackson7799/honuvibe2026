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
      <h1 className="text-2xl font-serif text-fg-primary">Content Freshness Review</h1>
      <p className="text-sm text-fg-secondary">
        Content items flagged for review. Items are auto-flagged after 6 months without review.
      </p>
      <VaultFreshnessQueue items={items} />
      <hr className="border-border-default" />
      <VaultContentRequests />
    </div>
  );
}
