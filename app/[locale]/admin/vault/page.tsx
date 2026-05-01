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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
          Vault Content
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/vault/series"
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-[10px] bg-bg-secondary border border-border-default text-fg-secondary text-[13px] font-semibold hover:border-border-hover hover:text-fg-primary transition-colors"
          >
            <Library size={16} />
            Series
          </Link>
          <Link
            href="/admin/vault/new"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[13px] font-semibold shadow-sm hover:shadow-md transition-all"
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
