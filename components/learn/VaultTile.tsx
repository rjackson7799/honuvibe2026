import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { SectionHeading } from '@/components/learn/SectionHeading';
import type { VaultContentItem } from '@/lib/vault/types';

type VaultTileProps = {
  items: VaultContentItem[];
  saved: number | null;
  newThisWeek: number | null;
  locale: string;
};

/**
 * Two recommendations, not six. The old dashboard opened with six large Vault
 * cards above the student's own courses — this is the same content, sized to its
 * actual priority.
 *
 * The footer counts are real Vault totals: saved bookmarks and items published
 * this week (the same Hawaii week as the hero's rail). There is no per-user
 * "unlocked" ledger, so nothing here claims one.
 */
export async function VaultTile({ items, saved, newThisWeek, locale }: VaultTileProps) {
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const prefix = locale === 'ja' ? '/ja' : '';

  const footer = [
    saved !== null ? t('tile_vault_saved', { count: saved }) : null,
    newThisWeek !== null ? t('tile_vault_new', { count: newThisWeek }) : null,
  ].filter(Boolean);

  return (
    <Card variant="learn" padding="md">
      <SectionHeading
        title={t('tile_vault_title')}
        icon={<Lock size={15} className="text-[color:var(--accent-teal)]" />}
        viewAllHref={`${prefix}/learn/vault`}
        viewAllLabel={t('tile_vault_browse')}
      />

      {items.length === 0 ? (
        <p className="text-[13.5px] text-fg-secondary">{t('tile_vault_empty')}</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((item, i) => {
            const title = locale === 'ja' && item.title_jp ? item.title_jp : item.title_en;
            return (
              <li key={item.id} className={i === 0 ? '' : 'border-t border-border-default'}>
                <Link
                  href={`${prefix}/learn/vault/${item.slug}`}
                  className="block py-2.5 hover:opacity-90 transition-opacity"
                >
                  {/* No content_type label: the DB enum (video_custom,
                      course_recording, …) does not line up with the
                      vault_filter_* keys, and a dynamic key would throw
                      MISSING_MESSAGE for the mismatched values. */}
                  <p className="text-[13px] font-medium text-fg-primary line-clamp-1">{title}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {footer.length > 0 && (
        <p className="mt-3 pt-3 border-t border-border-default text-[11.5px] text-fg-tertiary">
          {footer.join(' · ')}
        </p>
      )}

      {items.length === 0 && (
        <Link
          href={`${prefix}/learn/vault`}
          className="mt-3 inline-flex items-center gap-1.5 min-h-[44px] text-[13px] font-medium text-[color:var(--accent-teal)] hover:text-[color:var(--accent-teal-hover)] transition-colors"
        >
          {t('tile_vault_browse')}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      )}
    </Card>
  );
}
