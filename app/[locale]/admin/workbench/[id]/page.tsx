import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getAdminWorkbenchScenarioById } from '@/lib/workbench/queries';
import { getAvailableExecutorModels } from '@/lib/workbench/models';
import { AdminWorkbenchScenarioForm } from '@/components/admin/AdminWorkbenchScenarioForm';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  if (id === 'new') return { title: 'New Scenario — Admin' };
  const scenario = await getAdminWorkbenchScenarioById(id);
  return { title: scenario ? `${scenario.title_en} — Admin` : 'Scenario Not Found' };
}

export default async function AdminWorkbenchScenarioPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const availableModels = getAvailableExecutorModels();

  if (id === 'new') {
    return (
      <AdminWorkbenchScenarioForm scenario={null} availableModels={availableModels} />
    );
  }

  const scenario = await getAdminWorkbenchScenarioById(id);
  if (!scenario) notFound();

  return (
    <AdminWorkbenchScenarioForm scenario={scenario} availableModels={availableModels} />
  );
}
