import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getAdminInstructors } from '@/lib/instructors/queries';
import { AdminInstructorList } from '@/components/admin/AdminInstructorList';
import { Button } from '@/components/ui/button';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Instructors — Admin',
};

export default async function AdminInstructorsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const instructors = await getAdminInstructors();

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
          Instructors
        </h1>
        <Link href="/admin/instructors/new">
          <Button variant="primary" size="sm">
            <Plus size={16} className="mr-1.5" />
            Add Instructor
          </Button>
        </Link>
      </div>
      <AdminInstructorList instructors={instructors} />
    </div>
  );
}
