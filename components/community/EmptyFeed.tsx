import { getTranslations } from 'next-intl/server';
import { MessageSquarePlus } from 'lucide-react';

export async function EmptyFeed() {
  const t = await getTranslations('community');
  return (
    <div className="py-12 px-4 rounded-[14px] border border-dashed border-border-default bg-bg-tertiary text-center">
      <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)] flex items-center justify-center">
        <MessageSquarePlus size={24} />
      </div>
      <p className="text-fg-tertiary text-sm">{t('feed_empty')}</p>
    </div>
  );
}
