import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { getAdminProofArtifacts } from '@/lib/proof/queries';
import { AdminProofList } from '@/components/admin/AdminProofList';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Proof — Admin',
};

export default async function AdminProofPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const proof = await getAdminProofArtifacts();

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
          Proof &amp; Testimonials
        </h1>
        <Link
          href="/admin/proof/new"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[13px] font-semibold shadow-sm hover:shadow-md transition-all"
        >
          <PlusCircle size={16} />
          New Proof
        </Link>
      </div>
      <AdminProofList proof={proof} />
    </div>
  );
}
