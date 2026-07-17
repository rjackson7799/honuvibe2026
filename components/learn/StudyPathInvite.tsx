import Link from 'next/link';
import { ArrowRight, Route } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';

type StudyPathInviteProps = {
  locale: string;
};

/**
 * Shown where a study path would be when the student has none.
 *
 * Owned by the dashboard rather than added as an empty variant of PathCard: with
 * no path there is no path object to render, so an empty variant would mean
 * nullable props and a muddied contract for the component that does have data.
 *
 * Paths are AI-generated per student, so the copy invites building one and never
 * implies a fixed track.
 */
export async function StudyPathInvite({ locale }: StudyPathInviteProps) {
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const prefix = locale === 'ja' ? '/ja' : '';

  return (
    <Card variant="learn" padding="md">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 shrink-0 rounded-full bg-[color:var(--accent-teal-subtle)] flex items-center justify-center">
          <Route size={18} className="text-[color:var(--accent-teal)]" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-fg-primary">
            {t('path_invite_title')}
          </h3>
          <p className="mt-1 text-[13px] text-fg-tertiary max-w-[60ch]">
            {t('path_invite_body')}
          </p>
          <Link
            href={`${prefix}/learn/paths/new`}
            className="mt-2 inline-flex items-center gap-1.5 min-h-[44px] text-[13px] font-medium text-[color:var(--accent-teal)] hover:text-[color:var(--accent-teal-hover)] transition-colors"
          >
            {t('path_invite_cta')}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
