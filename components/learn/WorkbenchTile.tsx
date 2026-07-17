import Link from 'next/link';
import { ArrowRight, FlaskConical } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { SectionHeading } from '@/components/learn/SectionHeading';
import type { WorkbenchSummary } from '@/lib/workbench/queries';

type WorkbenchTileProps = {
  summary: WorkbenchSummary | null;
  locale: string;
};

/**
 * Practice count and a way in. Deliberately shows no score: the dashboard is the
 * surface meant to pull a student forward, and their worst result greeting them
 * every visit does the opposite. Scores live on the Workbench, in context.
 *
 * Renders nothing when there is no published scenario AND no history — with
 * nothing to offer, an empty tile would be furniture.
 */
export async function WorkbenchTile({ summary, locale }: WorkbenchTileProps) {
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const prefix = locale === 'ja' ? '/ja' : '';

  if (!summary) return null;
  if (summary.scenariosPracticed === 0 && !summary.featured) return null;

  const featuredTitle =
    summary.featured && locale === 'ja' && summary.featured.title_jp
      ? summary.featured.title_jp
      : summary.featured?.title_en;

  const href = summary.featured
    ? `${prefix}/learn/vault/workbench/${summary.featured.slug}`
    : `${prefix}/learn/vault/workbench`;

  return (
    <Card variant="learn" padding="md">
      <SectionHeading
        title={t('tile_workbench_title')}
        icon={<FlaskConical size={15} className="text-[color:var(--accent-teal)]" />}
      />

      {summary.scenariosPracticed > 0 ? (
        <p className="text-[13.5px] text-fg-secondary">
          {t('tile_workbench_practiced', { count: summary.scenariosPracticed })}
        </p>
      ) : (
        <div>
          <p className="text-[13.5px] text-fg-secondary">{t('tile_workbench_empty')}</p>
          {featuredTitle && (
            <p className="mt-1 text-[13.5px] font-semibold text-fg-primary truncate">
              {featuredTitle}
            </p>
          )}
        </div>
      )}

      <Link
        href={href}
        className="mt-3 inline-flex items-center gap-1.5 min-h-[44px] text-[13px] font-medium text-[color:var(--accent-teal)] hover:text-[color:var(--accent-teal-hover)] transition-colors"
      >
        {t('tile_workbench_cta')}
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </Card>
  );
}
