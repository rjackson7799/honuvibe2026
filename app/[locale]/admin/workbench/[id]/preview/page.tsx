import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getAdminWorkbenchScenarioById } from '@/lib/workbench/queries';
import { AdminWorkbenchPreview } from '@/components/admin/AdminWorkbenchPreview';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const scenario = await getAdminWorkbenchScenarioById(id);
  return {
    title: scenario ? `Preview: ${scenario.title_en} — Admin` : 'Scenario Not Found',
  };
}

export default async function AdminWorkbenchPreviewPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const scenario = await getAdminWorkbenchScenarioById(id);
  if (!scenario) notFound();

  return <AdminWorkbenchPreview scenario={scenario} />;
}
