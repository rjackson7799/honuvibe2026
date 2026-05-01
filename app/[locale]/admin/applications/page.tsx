import { setRequestLocale } from 'next-intl/server';
import { getApplications } from '@/lib/admin/queries';
import { AdminApplicationList } from '@/components/admin/AdminApplicationList';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Applications — Admin',
};

export default async function AdminApplicationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const applications = await getApplications();

  return (
    <div className="space-y-6 max-w-[1100px]">
      <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
        Applications
      </h1>
      <AdminApplicationList applications={applications} />
    </div>
  );
}
