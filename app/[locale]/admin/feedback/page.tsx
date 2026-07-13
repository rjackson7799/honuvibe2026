import { setRequestLocale } from 'next-intl/server';
import { getFeedback } from '@/lib/admin/queries';
import { AdminFeedbackList } from '@/components/admin/AdminFeedbackList';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Feedback — Admin',
};

export default async function AdminFeedbackPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const feedback = await getFeedback();

  return (
    <div className="space-y-6 max-w-[1100px]">
      <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
        Feedback
      </h1>
      <AdminFeedbackList feedback={feedback} />
    </div>
  );
}
