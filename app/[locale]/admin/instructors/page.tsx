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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-fg-primary">Instructors</h1>
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
