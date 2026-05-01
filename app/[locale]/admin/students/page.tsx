import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getStudentList } from '@/lib/admin/queries';
import { AdminStudentList } from '@/components/admin/AdminStudentList';
import { Button } from '@/components/ui/button';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Students — Admin',
};

export default async function AdminStudentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const students = await getStudentList();

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
          Students
        </h1>
        <Link href="/admin/students/new">
          <Button variant="primary" size="sm">
            <Plus size={16} className="mr-1.5" />
            Add Student
          </Button>
        </Link>
      </div>
      <AdminStudentList students={students} />
    </div>
  );
}
