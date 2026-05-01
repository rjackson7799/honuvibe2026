import { setRequestLocale } from 'next-intl/server';
import { CourseCreationStudio } from '@/components/admin/CourseCreationStudio';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Create Course — Admin',
};

export default async function AdminCourseUploadPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="max-w-[880px]">
      <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em] mb-2">
        Create Course
      </h1>
      <p className="text-sm text-fg-tertiary mb-6">
        Use the AI wizard to generate a complete course, or upload a markdown file.
        Review and edit all fields before creating.
      </p>
      <CourseCreationStudio />
    </div>
  );
}
