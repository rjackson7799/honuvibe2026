import { getTranslations } from 'next-intl/server';
import { Ban } from 'lucide-react';

export async function BannedBanner() {
  const t = await getTranslations('community');
  return (
    <div className="flex items-center gap-3 p-4 rounded-[14px] bg-[color:var(--accent-coral-subtle,#fef2f2)] border border-[color:var(--accent-coral,#dc2626)]/30 text-fg-primary">
      <Ban size={20} className="text-[color:var(--accent-coral,#dc2626)] shrink-0" />
      <p className="text-sm font-medium">{t('banned_banner')}</p>
    </div>
  );
}
