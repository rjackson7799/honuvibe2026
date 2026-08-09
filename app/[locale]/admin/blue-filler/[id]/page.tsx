import { notFound } from 'next/navigation';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import { getIdea } from '@/lib/blue-filler/queries';
import { getIndustry } from '@/lib/blue-filler/industry-map';
import { CommunityMarkdown } from '@/lib/community/markdown';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { BlueFillerIdeaOverview } from '@/components/admin/BlueFillerIdeaOverview';
import { BlueFillerKillMemoPanel } from '@/components/admin/BlueFillerKillMemoPanel';
import { BlueFillerResearchPanel } from '@/components/admin/BlueFillerResearchPanel';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export const metadata = {
  title: 'Blue Filler idea — Admin',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const THESIS_FIELDS: { key: keyof ThesisProse; label: string }[] = [
  { key: 'target_user', label: 'Target user' },
  { key: 'pain', label: 'Pain' },
  { key: 'ai_solution', label: 'AI solution' },
  { key: 'service_attachment', label: 'Service attachment' },
  { key: 'adoption_blocker', label: 'Adoption blocker' },
  { key: 'moat_angle', label: 'Moat angle' },
  { key: 'mvp_scope', label: 'Weekend MVP' },
];

type ThesisProse = {
  target_user: string;
  pain: string;
  ai_solution: string;
  service_attachment: string;
  adoption_blocker: string;
  moat_angle: string;
  mvp_scope: string;
};

export default async function AdminBlueFillerIdeaPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (!UUID_RE.test(id)) notFound();

  const idea = await getIdea(id);
  if (!idea) notFound();

  const industry = getIndustry(idea.industry_key);

  return (
    <div className="space-y-6 max-w-[1100px]">
      <Link
        href="/admin/blue-filler"
        className="inline-flex items-center gap-1.5 text-sm text-fg-tertiary hover:text-fg-primary"
      >
        <ArrowLeft className="w-4 h-4" />
        Blue Filler
      </Link>

      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
            {idea.title}
          </h1>
          <StatusBadge status={idea.status} />
          {idea.verdict && <StatusBadge status={idea.verdict} />}
        </div>
        <p className="mt-1 text-sm text-fg-secondary">{idea.one_liner}</p>
        <p className="mt-1.5 text-[11px] text-fg-muted">
          {industry?.label ?? idea.industry_key} · origin {idea.origin} · {idea.model_id} ·{' '}
          {idea.pipeline_version}
          {idea.build_sha ? ` · ${idea.build_sha.slice(0, 7)}` : ''}
        </p>
      </div>

      <BlueFillerIdeaOverview idea={idea} />

      <section className="rounded-xl border border-border-primary bg-bg-secondary p-5">
        <h2 className="text-base font-semibold text-fg-primary">Thesis</h2>
        <dl className="mt-4 space-y-3">
          {THESIS_FIELDS.map((field) => (
            <div key={field.key}>
              <dt className="text-[11px] uppercase tracking-[0.04em] text-fg-muted">
                {field.label}
              </dt>
              <dd className="mt-0.5 text-sm text-fg-secondary">{idea.thesis[field.key]}</dd>
            </div>
          ))}
          <div>
            <dt className="text-[11px] uppercase tracking-[0.04em] text-fg-muted">
              Acquirer hypothesis
            </dt>
            <dd className="mt-0.5">
              <ul className="space-y-1">
                {idea.thesis.acquirer_hypothesis.map((hypothesis, index) => (
                  <li key={index} className="text-sm text-fg-secondary flex gap-2">
                    <span className="text-fg-muted">▸</span>
                    <span>{hypothesis}</span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-border-primary bg-bg-secondary p-5">
        <h2 className="text-base font-semibold text-fg-primary">The pitch</h2>
        <div className="mt-3">
          <CommunityMarkdown body={idea.summary_md} />
        </div>
      </section>

      {idea.source_excerpt && (
        <section className="rounded-xl border border-border-primary bg-bg-secondary p-5">
          <h2 className="text-base font-semibold text-fg-primary">Seed source</h2>
          <p className="mt-3 text-sm text-fg-tertiary whitespace-pre-wrap">{idea.source_excerpt}</p>
        </section>
      )}

      <BlueFillerKillMemoPanel idea={idea} />

      <BlueFillerResearchPanel idea={idea} />
    </div>
  );
}
