import { setRequestLocale } from 'next-intl/server';
import { getPreviewSummaries, PREVIEW_LIST_LIMIT } from '@/lib/previews/admin-queries';
import { AdminPreviewsList } from '@/components/admin/AdminPreviewsList';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Client Previews — Admin',
};

export default async function AdminStudioPreviewsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const previews = await getPreviewSummaries();
  const now = Date.now();

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div>
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
          Client Previews
        </h1>
        <p className="mt-1 text-sm text-fg-tertiary">
          Client previews and the feedback reviewers leave on them.
        </p>
      </div>
      <AdminPreviewsList
        previews={previews}
        now={now}
        truncated={previews.length >= PREVIEW_LIST_LIMIT}
      />
    </div>
  );
}
