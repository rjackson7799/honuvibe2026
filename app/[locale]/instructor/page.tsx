import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function InstructorRootPage({ params }: Props) {
  const { locale } = await params;
  const prefix = locale === 'ja' ? '/ja' : '';
  redirect(`${prefix}/instructor/courses`);
}
