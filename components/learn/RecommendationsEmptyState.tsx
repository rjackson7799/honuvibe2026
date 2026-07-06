import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export async function RecommendationsEmptyState() {
  const t = await getTranslations('dashboard');

  return (
    <Card variant="learn" padding="md">
      <div className="flex flex-col items-center text-center gap-3 py-4">
        <div className="w-11 h-11 rounded-full bg-[color:var(--accent-teal-subtle)] flex items-center justify-center">
          <Sparkles size={20} className="text-[color:var(--accent-teal)]" />
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-fg-primary mb-1">
            {t('recs_empty_heading')}
          </h3>
          <p className="text-[13px] text-fg-tertiary max-w-md">{t('recs_empty_subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-1">
          <Link href="/learn/paths/new">
            <Button variant="primary" size="sm">
              {t('recs_empty_cta_path')}
            </Button>
          </Link>
          <Link href="/learn/vault">
            <Button variant="ghost" size="sm">
              {t('recs_empty_cta_vault')}
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
