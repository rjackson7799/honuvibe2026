import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { AdminBusinessUpgradeEditor } from '@/components/admin/AdminBusinessUpgradeEditor';
import { getBusinessUpgradeProjectAdmin } from '@/lib/business-upgrades/queries';

type Props = {
  params: Promise<{ locale: string; projectId: string }>;
};

export default async function Page({ params }: Props) {
  const { locale, projectId } = await params;
  setRequestLocale(locale);
  const data = await getBusinessUpgradeProjectAdmin(projectId);
  if (!data.project) notFound();
  const prefix = locale === 'ja' ? '/ja' : '';

  return (
    <div className="max-w-[1000px] space-y-6">
      <div>
        <Link
          href={`${prefix}/admin/business-upgrades`}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-[13px] text-fg-tertiary transition-colors hover:bg-bg-secondary hover:text-fg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal"
        >
          <ArrowLeft size={15} aria-hidden="true" /> Back to Business Upgrades
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-fg-primary">
          Edit Business Upgrade
        </h1>
        <p className="mt-1 text-sm text-fg-secondary">
          Saving a published project returns it to draft and advances its version.
        </p>
      </div>
      <AdminBusinessUpgradeEditor
        project={data.project}
        resources={data.resources}
        scenarios={data.scenarios}
      />
    </div>
  );
}
