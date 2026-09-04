import { setRequestLocale } from 'next-intl/server';
import { getEngagements } from '@/lib/admin/queries';
import { AdminEngagementsList } from '@/components/admin/AdminEngagementsList';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Engagements — Admin',
};

// Copy of the leads list page's shape. Deliberately NO "New" button —
// creation is a lead-workspace action (Start engagement on a qualified lead).
export default async function AdminEngagementsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const engagements = await getEngagements();

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div>
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
          Engagements
        </h1>
        <p className="mt-1 text-sm text-fg-tertiary">
          Every client project from discovery through care. Start one from a qualified lead.
        </p>
      </div>
      <AdminEngagementsList engagements={engagements} />
    </div>
  );
}
