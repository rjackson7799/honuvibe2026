'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Star, Trash2 } from 'lucide-react';
import {
  createScenario,
  updateScenario,
  publishScenario,
  unpublishScenario,
  setScenarioFeatured,
  deleteScenario,
} from '@/lib/workbench/actions';
import {
  WORKBENCH_DOMAINS,
  WORKBENCH_DIFFICULTIES,
  WORKBENCH_DIMENSIONS,
  type CreateWorkbenchScenarioInput,
  type WorkbenchDifficulty,
  type WorkbenchDimension,
  type WorkbenchDomain,
  type WorkbenchScenario,
} from '@/lib/workbench/types';

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-default text-fg-primary text-sm focus:border-accent-teal outline-none';
const labelCls = 'block text-[13px] font-medium text-fg-secondary mb-1';
const btnPrimary =
  'inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[13px] font-semibold disabled:opacity-50 transition-all';
const btnGhost =
  'inline-flex items-center gap-2 h-10 px-3.5 rounded-[10px] bg-bg-secondary border border-border-default text-fg-secondary text-[13px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors';

export function AdminWorkbenchScenarioForm({
  scenario,
}: {
  scenario: WorkbenchScenario | null;
}) {
  const router = useRouter();
  const isCreate = scenario === null;

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [slug, setSlug] = useState(scenario?.slug ?? '');
  const [titleEn, setTitleEn] = useState(scenario?.title_en ?? '');
  const [titleJp, setTitleJp] = useState(scenario?.title_jp ?? '');
  const [domain, setDomain] = useState<WorkbenchDomain>(scenario?.domain ?? WORKBENCH_DOMAINS[0]);
  const [difficulty, setDifficulty] = useState<WorkbenchDifficulty>(
    scenario?.difficulty ?? WORKBENCH_DIFFICULTIES[0],
  );
  const [briefEn, setBriefEn] = useState(scenario?.brief_en ?? '');
  const [briefJp, setBriefJp] = useState(scenario?.brief_jp ?? '');
  const [dimensions, setDimensions] = useState<WorkbenchDimension[]>(
    scenario?.applicable_dimensions ?? [],
  );
  const [expertPromptEn, setExpertPromptEn] = useState(scenario?.expert_prompt_en ?? '');
  const [expertPromptJp, setExpertPromptJp] = useState(scenario?.expert_prompt_jp ?? '');
  const [expertOutputEn, setExpertOutputEn] = useState(scenario?.expert_output_en ?? '');
  const [expertOutputJp, setExpertOutputJp] = useState(scenario?.expert_output_jp ?? '');
  const [whyEn, setWhyEn] = useState(scenario?.why_this_works_en ?? '');
  const [whyJp, setWhyJp] = useState(scenario?.why_this_works_jp ?? '');

  function toggleDimension(dim: WorkbenchDimension) {
    setDimensions((prev) =>
      prev.includes(dim) ? prev.filter((d) => d !== dim) : [...prev, dim],
    );
  }

  async function run(fn: () => Promise<unknown>, ok = 'Saved.') {
    setBusy(true);
    setMessage('');
    try {
      await fn();
      setMessage(ok);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  function payload(): CreateWorkbenchScenarioInput {
    return {
      slug: slug.trim(),
      title_en: titleEn,
      title_jp: titleJp || null,
      domain,
      difficulty,
      brief_en: briefEn,
      brief_jp: briefJp || null,
      applicable_dimensions: dimensions,
      expert_prompt_en: expertPromptEn,
      expert_prompt_jp: expertPromptJp || null,
      expert_output_en: expertOutputEn,
      expert_output_jp: expertOutputJp || null,
      why_this_works_en: whyEn || null,
      why_this_works_jp: whyJp || null,
    };
  }

  // The NOT NULL columns must be present to create the row at all.
  const canCreate =
    slug.trim() !== '' &&
    titleEn.trim() !== '' &&
    briefEn.trim() !== '' &&
    expertPromptEn.trim() !== '' &&
    expertOutputEn.trim() !== '' &&
    dimensions.length > 0;

  async function handleCreate() {
    await run(async () => {
      const { id } = await createScenario(payload());
      router.push(`/admin/workbench/${id}`);
    }, 'Created.');
  }

  return (
    <div className="max-w-[920px] space-y-6">
      <BackLink />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[clamp(20px,2.4vw,26px)] font-bold text-fg-primary tracking-[-0.02em]">
            {isCreate ? 'New Scenario' : titleEn || 'Untitled scenario'}
          </h1>
          {!isCreate && (
            <p className="text-[13px] text-fg-tertiary mt-1">
              {scenario!.is_published ? 'Published' : 'Draft'}
              {scenario!.is_featured ? ' · Featured' : ''}
            </p>
          )}
        </div>

        {!isCreate && (
          <div className="flex items-center gap-2 flex-wrap">
            {scenario!.is_published ? (
              <button
                className={btnGhost}
                disabled={busy}
                onClick={() => run(() => unpublishScenario(scenario!.id), 'Unpublished.')}
              >
                <EyeOff size={15} /> Unpublish
              </button>
            ) : (
              <button
                className={btnPrimary}
                disabled={busy}
                onClick={() => run(() => publishScenario(scenario!.id), 'Published.')}
              >
                <Eye size={15} /> Publish
              </button>
            )}
            <button
              className={btnGhost}
              disabled={busy}
              onClick={() =>
                run(
                  () => setScenarioFeatured(scenario!.id, !scenario!.is_featured),
                  scenario!.is_featured ? 'Unfeatured.' : 'Featured.',
                )
              }
            >
              <Star size={15} /> {scenario!.is_featured ? 'Unfeature' : 'Feature'}
            </button>
            <button
              className={btnGhost}
              disabled={busy}
              onClick={() => {
                if (window.confirm('Delete this scenario? Member attempts against it are also removed.')) {
                  run(async () => {
                    await deleteScenario(scenario!.id);
                    router.push('/admin/workbench');
                  }, 'Deleted.');
                }
              }}
            >
              <Trash2 size={15} /> Delete
            </button>
          </div>
        )}
      </div>

      {message && <Banner text={message} />}

      <div className="space-y-4">
        {/* Basics */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Labeled label="Slug">
            <input
              className={inputCls}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="launch-copy-hero"
            />
          </Labeled>
          <Labeled label="Domain">
            <select
              className={inputCls}
              value={domain}
              onChange={(e) => setDomain(e.target.value as WorkbenchDomain)}
            >
              {WORKBENCH_DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Difficulty">
            <select
              className={inputCls}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as WorkbenchDifficulty)}
            >
              {WORKBENCH_DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Labeled>
        </div>

        {/* Titles */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Labeled label="Title (EN)">
            <input className={inputCls} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          </Labeled>
          <Labeled label="Title (JP)">
            <input className={inputCls} value={titleJp} onChange={(e) => setTitleJp(e.target.value)} />
          </Labeled>
        </div>

        {/* Applicable dimensions */}
        <div>
          <span className={labelCls}>Applicable dimensions</span>
          <div className="flex flex-wrap gap-2">
            {WORKBENCH_DIMENSIONS.map((dim) => {
              const on = dimensions.includes(dim);
              return (
                <button
                  key={dim}
                  type="button"
                  onClick={() => toggleDimension(dim)}
                  className={`px-3 py-1.5 rounded-lg border text-[13px] font-medium capitalize transition-colors ${
                    on
                      ? 'bg-accent-teal/10 border-accent-teal text-accent-teal'
                      : 'bg-bg-secondary border-border-default text-fg-tertiary hover:text-fg-secondary'
                  }`}
                  aria-pressed={on}
                >
                  {dim}
                </button>
              );
            })}
          </div>
          <p className="text-[12px] text-fg-tertiary mt-1.5">
            The prompting dimensions this scenario exercises and the evaluator scores.
          </p>
        </div>

        {/* Brief */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Labeled label="Brief (EN)">
            <textarea className={inputCls} rows={4} value={briefEn} onChange={(e) => setBriefEn(e.target.value)} />
          </Labeled>
          <Labeled label="Brief (JP)">
            <textarea className={inputCls} rows={4} value={briefJp} onChange={(e) => setBriefJp(e.target.value)} />
          </Labeled>
        </div>

        {/* Expert prompt */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Labeled label="Expert prompt (EN)">
            <textarea className={inputCls} rows={4} value={expertPromptEn} onChange={(e) => setExpertPromptEn(e.target.value)} />
          </Labeled>
          <Labeled label="Expert prompt (JP)">
            <textarea className={inputCls} rows={4} value={expertPromptJp} onChange={(e) => setExpertPromptJp(e.target.value)} />
          </Labeled>
        </div>

        {/* Expert output */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Labeled label="Expert output (EN)">
            <textarea className={inputCls} rows={4} value={expertOutputEn} onChange={(e) => setExpertOutputEn(e.target.value)} />
          </Labeled>
          <Labeled label="Expert output (JP)">
            <textarea className={inputCls} rows={4} value={expertOutputJp} onChange={(e) => setExpertOutputJp(e.target.value)} />
          </Labeled>
        </div>

        {/* Why this works (optional) */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Labeled label="Why this works (EN) — optional">
            <textarea className={inputCls} rows={3} value={whyEn} onChange={(e) => setWhyEn(e.target.value)} />
          </Labeled>
          <Labeled label="Why this works (JP) — optional">
            <textarea className={inputCls} rows={3} value={whyJp} onChange={(e) => setWhyJp(e.target.value)} />
          </Labeled>
        </div>

        {isCreate ? (
          <button className={btnPrimary} disabled={busy || !canCreate} onClick={handleCreate}>
            Create scenario
          </button>
        ) : (
          <button className={btnPrimary} disabled={busy} onClick={() => run(() => updateScenario(scenario!.id, payload()))}>
            Save scenario
          </button>
        )}

        {isCreate && (
          <p className="text-[12px] text-fg-tertiary">
            Fill the English fields and pick at least one dimension to create the draft. Add the
            Japanese companions before publishing — both languages are required to publish.
          </p>
        )}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <a
      href="/admin/workbench"
      className="inline-flex items-center gap-1.5 text-[13px] text-fg-tertiary hover:text-fg-secondary"
    >
      <ArrowLeft size={15} /> All scenarios
    </a>
  );
}

function Banner({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary px-4 py-2.5 text-[13px] text-fg-secondary">
      {text}
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}
