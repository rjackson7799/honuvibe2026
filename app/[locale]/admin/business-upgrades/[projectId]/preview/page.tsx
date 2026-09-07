import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getBusinessUpgradeProjectPreview } from '@/lib/business-upgrades/queries';

type Props = {
  params: Promise<{ locale: string; projectId: string }>;
};

export default async function Page({ params }: Props) {
  const { locale, projectId } = await params;
  setRequestLocale(locale);

  const data = await getBusinessUpgradeProjectPreview(projectId);
  if (!data) notFound();

  const lang = locale === 'ja' ? 'ja' : 'en';
  const prefix = locale === 'ja' ? '/ja' : '';
  const backLabel = lang === 'ja' ? 'ビジネスアップグレードに戻る' : 'Back to Business Upgrades';

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href={`${prefix}/admin/business-upgrades`}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-fg-secondary transition-colors hover:bg-bg-tertiary hover:text-fg-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {backLabel}
      </Link>

      <div className="rounded-2xl border border-border-default bg-bg-secondary p-7">
        <span className="text-xs font-semibold uppercase text-accent-teal">
          {data.project.status} · v{data.project.templateVersion}
        </span>
        <h1 className="mt-2 text-2xl font-bold text-fg-primary">{data.project.title[lang]}</h1>
        <p className="mt-3 text-sm leading-6 text-fg-secondary">
          {data.project.description[lang]}
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-bg-tertiary p-4">
            <b>Outcome</b>
            <p className="mt-1 text-sm">{data.project.outcome[lang]}</p>
          </div>
          <div className="rounded-xl bg-bg-tertiary p-4">
            <b>Deliverable</b>
            <p className="mt-1 text-sm">{data.project.deliverable[lang]}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {data.steps.map((step) => (
          <div key={step.id} className="rounded-xl border border-border-default bg-bg-secondary p-4">
            <span className="text-xs text-fg-tertiary">
              {step.sort_order}. {step.step_type}
            </span>
            <h2 className="mt-1 font-semibold text-fg-primary">
              {lang === 'ja' ? step.title_ja : step.title_en}
            </h2>
            <p className="mt-1 text-sm text-fg-secondary">
              {lang === 'ja' ? step.instructions_ja : step.instructions_en}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
