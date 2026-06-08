import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getAdminProofArtifactById } from '@/lib/proof/queries';
import { AdminProofForm } from '@/components/admin/AdminProofForm';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  if (id === 'new') return { title: 'New Proof — Admin' };
  const proof = await getAdminProofArtifactById(id);
  return {
    title: proof ? `${proof.person_name ?? 'Proof'} — Admin` : 'Proof Not Found',
  };
}

export default async function AdminProofDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (id === 'new') {
    return <AdminProofForm proof={null} />;
  }

  const proof = await getAdminProofArtifactById(id);
  if (!proof) notFound();

  return <AdminProofForm proof={proof} />;
}
