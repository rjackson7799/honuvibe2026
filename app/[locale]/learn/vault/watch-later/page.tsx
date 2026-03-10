import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getVaultUserBookmarks } from '@/lib/vault/queries';
import { VaultContentCard } from '@/components/vault/VaultContentCard';
import { VaultSubNav } from '@/components/vault/VaultSubNav';
import { Clock } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Watch Later — The Vault',
  description: 'Your watch later queue from The Vault.',
};

export default async function VaultWatchLaterPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/learn');
  }

  const items = await getVaultUserBookmarks(user.id, 'watch_later');

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif text-fg-primary mb-2">Watch Later</h1>
        <p className="text-fg-secondary">Videos you&apos;ve queued up to watch.</p>
      </div>

      <VaultSubNav isAuthenticated />

      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <VaultContentCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Clock size={32} className="mx-auto mb-3 text-fg-tertiary" />
          <p className="text-fg-tertiary text-sm">
            Your watch later queue is empty. Add videos to watch them later.
          </p>
        </div>
      )}
    </div>
  );
}
