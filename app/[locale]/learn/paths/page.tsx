import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Route, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getUserPaths } from '@/lib/paths/queries';
import { DashboardPageHeader } from '@/components/learn/DashboardPageHeader';
import { PathCard } from '@/components/learn/PathCard';
import { Button } from '@/components/ui/button';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'study_paths' });

  return {
    title: t('page_title'),
  };
}

export default async function StudyPathsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const prefix = locale === 'ja' ? '/ja' : '';

  if (!user) {
    redirect(
      `${prefix}/learn/auth?redirect=${encodeURIComponent(`${prefix}/learn/paths`)}`,
    );
  }

  const t = await getTranslations({ locale, namespace: 'study_paths' });
  const paths = await getUserPaths(user.id);

  // Active paths first, then completed — each group already newest-first
  const sortedPaths = [
    ...paths.filter((p) => p.status === 'active'),
    ...paths.filter((p) => p.status !== 'active'),
  ];

  return (
    <div className="space-y-8 max-w-[800px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <DashboardPageHeader
          icon={Route}
          title={t('page_title')}
          subtitle={t('list_subtitle')}
          count={paths.length > 0 ? String(paths.length) : undefined}
        />
        <Button
          href={`${prefix}/learn/paths/new`}
          size="sm"
          icon={Plus}
        >
          {t('create_new')}
        </Button>
      </div>

      {sortedPaths.length === 0 ? (
        <div className="py-10 px-4 rounded-[10px] border border-dashed border-border-primary bg-bg-secondary text-center">
          <p className="text-sm text-fg-secondary">{t('no_paths')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sortedPaths.map((path) => (
            <PathCard key={path.id} path={path} />
          ))}
        </div>
      )}
    </div>
  );
}
