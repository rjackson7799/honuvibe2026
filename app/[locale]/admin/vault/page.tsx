import { setRequestLocale } from 'next-intl/server';
import { getVaultAdminItems, getVaultStats } from '@/lib/vault/queries';
import { AdminVaultList } from '@/components/admin/AdminVaultList';
import Link from 'next/link';
import { PlusCircle, Library } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Vault — Admin',
};

export default async function AdminVaultPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const items = await getVaultAdminItems({});

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-fg-primary">Vault Content</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/vault/series"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-default text-fg-secondary text-sm font-medium hover:border-border-hover hover:text-fg-primary transition-colors"
          >
            <Library size={16} />
            Series
          </Link>
          <Link
            href="/admin/vault/new"
            className="flex items-center gap-2 px-4 py-2 bg-accent-teal text-white rounded-lg text-sm font-medium hover:bg-accent-teal/90 transition-colors"
          >
            <PlusCircle size={16} />
            Add Content
          </Link>
        </div>
      </div>
      <AdminVaultList items={items} />
    </div>
  );
}
