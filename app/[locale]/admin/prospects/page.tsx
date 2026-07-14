import { setRequestLocale } from 'next-intl/server';
import { getProspects, getScoringCount } from '@/lib/admin/queries';
import { AdminProspectList } from '@/components/admin/AdminProspectList';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Prospects — Admin',
};

export default async function AdminProspectsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [prospects, scoringCount] = await Promise.all([getProspects(), getScoringCount()]);

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div>
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
          Prospects
        </h1>
        <p className="mt-1 text-sm text-fg-tertiary">
          Search local businesses and score their websites for rebuild opportunities.
        </p>
      </div>
      <AdminProspectList initialProspects={prospects} initialScoringCount={scoringCount} />
    </div>
  );
}
