import { setRequestLocale } from 'next-intl/server';
import { getInstructorApplications } from '@/lib/instructor-applications/actions';
import { AdminInstructorApplicationList } from '@/components/admin/AdminInstructorApplicationList';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Instructor Applications — Admin',
};

export default async function AdminInstructorApplicationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const applications = await getInstructorApplications();

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div>
        <h1 className="text-2xl font-serif text-fg-primary">Instructor Applications</h1>
        <p className="text-sm text-fg-tertiary mt-1">
          Review, approve, and reject instructor applicants.
        </p>
      </div>
      <AdminInstructorApplicationList applications={applications} />
    </div>
  );
}
