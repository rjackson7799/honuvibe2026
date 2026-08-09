import { setRequestLocale } from 'next-intl/server';
import { listIdeas } from '@/lib/blue-filler/queries';
import { INDUSTRY_MAP } from '@/lib/blue-filler/industry-map';
import { BlueFillerGeneratePanel } from '@/components/admin/BlueFillerGeneratePanel';
import { BlueFillerIdeasTable } from '@/components/admin/BlueFillerIdeasTable';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Blue Filler — Admin',
};

/** The map is reviewed as a set; the oldest review date is the honest one to show. */
function priorsReviewedAt(): string {
  return INDUSTRY_MAP.map((entry) => entry.lastReviewedAt).sort()[0] ?? '—';
}

export default async function AdminBlueFillerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ideas = await listIdeas();

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div>
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
          Blue Filler
        </h1>
        <p className="mt-1 text-sm text-fg-tertiary">
          Industries where AI&apos;s capability far outruns its adoption. Generate an idea, score
          it, try to kill it, then research it against live sources.
        </p>
      </div>

      <BlueFillerGeneratePanel priorsReviewedAt={priorsReviewedAt()} />

      <BlueFillerIdeasTable ideas={ideas} />
    </div>
  );
}
