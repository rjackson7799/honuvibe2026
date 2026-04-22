import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getInstructorApplicationById } from '@/lib/instructor-applications/actions';
import { AdminInstructorApplicationDetail } from '@/components/admin/AdminInstructorApplicationDetail';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export const metadata = {
  title: 'Instructor Application — Admin',
};

export default async function AdminInstructorApplicationDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const application = await getInstructorApplicationById(id);
  if (!application) notFound();

  return (
    <div className="space-y-6 max-w-[980px]">
      <Link
        href="/admin/instructor-applications"
        className="text-sm text-fg-tertiary hover:text-accent-teal transition-colors"
      >
        ← All applications
      </Link>

      <AdminInstructorApplicationDetail application={application} />
    </div>
  );
}
