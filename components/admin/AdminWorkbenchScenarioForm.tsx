'use client';

// Admin Workbench scenario editor — sectioned form (Basics / English content /
// Japanese content) with a live publish-readiness panel on the right. A single
// draft object backs all fields; dirty state is tracked against a JSON snapshot
// so navigating away warns before losing edits.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Languages, Loader2, Play } from 'lucide-react';
import {
  createScenario,
  updateScenario,
  publishScenario,
  unpublishScenario,
  setScenarioFeatured,
  deleteScenario,
} from '@/lib/workbench/actions';
import { validateScenarioForPublish } from '@/lib/workbench/validation';
import { EXECUTOR_MODELS } from '@/lib/workbench/models';
import { AdminWorkbenchPublishPanel } from './AdminWorkbenchPublishPanel';
import { AdminWorkbenchDraftAssist } from './AdminWorkbenchDraftAssist';
import { AdminWorkbenchSanityCheck } from './AdminWorkbenchSanityCheck';
import type {
  WorkbenchDraftResult,
  WorkbenchTranslationResult,
} from '@/lib/workbench/authoring';
import {
  WORKBENCH_DOMAINS,
  WORKBENCH_DIFFICULTIES,
  WORKBENCH_DIMENSIONS,
  createWorkbenchScenarioSchema,
  type CreateWorkbenchScenarioInput,
  type WorkbenchDifficulty,
  type WorkbenchDimension,
  type WorkbenchDomain,
  type WorkbenchExecutorModel,
  type WorkbenchScenario,
} from '@/lib/workbench/types';

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-bg-primary border border-border-default text-fg-primary text-sm focus:border-accent-teal outline-none';
const labelCls = 'block text-[13px] font-medium text-fg-secondary mb-1';

// All form fields as plain strings (textareas can't hold null); draftToInput
// converts back to the action payload shape.
export type ScenarioDraft = {
  slug: string;
  title_en: string;
  title_jp: string;
  domain: WorkbenchDomain;
  difficulty: WorkbenchDifficulty;
  brief_en: string;
  brief_jp: string;
  applicable_dimensions: WorkbenchDimension[];
  expert_prompt_en: string;
  expert_prompt_jp: string;
  expert_output_en: string;
  expert_output_jp: string;
  why_this_works_en: string;
  why_this_works_jp: string;
  jp_needs_review: boolean;
};

export type JpDraftField =
  | 'title_jp'
  | 'brief_jp'
  | 'expert_prompt_jp'
  | 'expert_output_jp'
  | 'why_this_works_jp';

export const JP_DRAFT_FIELDS: JpDraftField[] = [
  'title_jp',
  'brief_jp',
  'expert_prompt_jp',
  'expert_output_jp',
  'why_this_works_jp',
];

function draftFromScenario(scenario: WorkbenchScenario | null): ScenarioDraft {
  return {
    slug: scenario?.slug ?? '',
    title_en: scenario?.title_en ?? '',
    title_jp: scenario?.title_jp ?? '',
    domain: scenario?.domain ?? WORKBENCH_DOMAINS[0],
    difficulty: scenario?.difficulty ?? WORKBENCH_DIFFICULTIES[0],
    brief_en: scenario?.brief_en ?? '',
    brief_jp: scenario?.brief_jp ?? '',
    applicable_dimensions: scenario?.applicable_dimensions ?? [],
    expert_prompt_en: scenario?.expert_prompt_en ?? '',
    expert_prompt_jp: scenario?.expert_prompt_jp ?? '',
    expert_output_en: scenario?.expert_output_en ?? '',
    expert_output_jp: scenario?.expert_output_jp ?? '',
    why_this_works_en: scenario?.why_this_works_en ?? '',
    why_this_works_jp: scenario?.why_this_works_jp ?? '',
    jp_needs_review: scenario?.jp_needs_review ?? false,
  };
}

export function draftToInput(draft: ScenarioDraft): CreateWorkbenchScenarioInput {
  return {
    slug: draft.slug.trim(),
    title_en: draft.title_en,
    title_jp: draft.title_jp || null,
    domain: draft.domain,
    difficulty: draft.difficulty,
    brief_en: draft.brief_en,
    brief_jp: draft.brief_jp || null,
    applicable_dimensions: draft.applicable_dimensions,
    expert_prompt_en: draft.expert_prompt_en,
    expert_prompt_jp: draft.expert_prompt_jp || null,
    expert_output_en: draft.expert_output_en,
    expert_output_jp: draft.expert_output_jp || null,
    why_this_works_en: draft.why_this_works_en || null,
    why_this_works_jp: draft.why_this_works_jp || null,
    jp_needs_review: draft.jp_needs_review,
  };
}

export function AdminWorkbenchScenarioForm({
  scenario,
  availableModels,
}: {
  scenario: WorkbenchScenario | null;
  /** Executor models with a configured API key (for the generate-output assist). */
  availableModels: WorkbenchExecutorModel[];
}) {
  const router = useRouter();
  const isCreate = scenario === null;

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [aiDrafted, setAiDrafted] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [assistError, setAssistError] = useState('');
  const [draft, setDraft] = useState<ScenarioDraft>(() => draftFromScenario(scenario));
  const [snapshot, setSnapshot] = useState<string>(() =>
    JSON.stringify(draftFromScenario(scenario)),
  );
  // JP fields filled by the translate assist and not yet hand-edited.
  const [machineFilled, setMachineFilled] = useState<Set<JpDraftField>>(new Set());

  const dirty = JSON.stringify(draft) !== snapshot;

  // Warn before a full navigation/refresh loses unsaved edits. Client-side
  // route changes are covered by the back-link confirm below.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const publishErrors = useMemo(
    () => validateScenarioForPublish(draftToInput(draft)),
    [draft],
  );
  const canCreate = useMemo(
    () => createWorkbenchScenarioSchema.safeParse(draftToInput(draft)).success,
    [draft],
  );

  function set<K extends keyof ScenarioDraft>(key: K, value: ScenarioDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function setJpField(key: JpDraftField, value: string) {
    set(key, value);
    // A hand edit means this field is no longer raw machine output.
    setMachineFilled((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  function toggleDimension(dim: WorkbenchDimension) {
    setDraft((prev) => ({
      ...prev,
      applicable_dimensions: prev.applicable_dimensions.includes(dim)
        ? prev.applicable_dimensions.filter((d) => d !== dim)
        : [...prev.applicable_dimensions, dim],
    }));
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

  async function handleCreate() {
    await run(async () => {
      const { id } = await createScenario(draftToInput(draft));
      setSnapshot(JSON.stringify(draft));
      router.push(`/admin/workbench/${id}`);
    }, 'Created.');
  }

  async function handleSave() {
    await run(async () => {
      await updateScenario(scenario!.id, draftToInput(draft));
      setSnapshot(JSON.stringify(draft));
    });
  }

  function handleBack(e: React.MouseEvent) {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) {
      e.preventDefault();
    }
  }

  function markJpReviewed() {
    set('jp_needs_review', false);
    setMachineFilled(new Set());
  }

  function applyAiDraft(
    result: WorkbenchDraftResult,
    domain: WorkbenchDomain,
    difficulty: WorkbenchDifficulty,
  ) {
    setDraft((prev) => ({
      ...prev,
      slug: result.slug,
      title_en: result.title_en,
      brief_en: result.brief_en,
      expert_prompt_en: result.expert_prompt_en,
      expert_output_en: result.expert_output_en,
      why_this_works_en: result.why_this_works_en,
      applicable_dimensions: result.applicable_dimensions,
      domain,
      difficulty,
    }));
    setAiDrafted(true);
  }

  const canTranslate =
    draft.title_en.trim() !== '' &&
    draft.brief_en.trim() !== '' &&
    draft.expert_prompt_en.trim() !== '' &&
    draft.expert_output_en.trim() !== '';

  const hasJpContent = JP_DRAFT_FIELDS.some((f) => draft[f].trim() !== '');

  async function handleTranslate() {
    if (
      hasJpContent &&
      !window.confirm('Translating will replace the current Japanese fields. Continue?')
    ) {
      return;
    }
    setTranslating(true);
    setAssistError('');
    try {
      const res = await fetch('/api/admin/workbench/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title_en: draft.title_en,
          brief_en: draft.brief_en,
          expert_prompt_en: draft.expert_prompt_en,
          expert_output_en: draft.expert_output_en,
          why_this_works_en: draft.why_this_works_en.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAssistError(data.error ?? 'Translate assist failed.');
        return;
      }
      const jp = data as WorkbenchTranslationResult;
      setDraft((prev) => ({
        ...prev,
        title_jp: jp.title_jp,
        brief_jp: jp.brief_jp,
        expert_prompt_jp: jp.expert_prompt_jp,
        expert_output_jp: jp.expert_output_jp,
        why_this_works_jp: jp.why_this_works_jp ?? '',
        jp_needs_review: true,
      }));
      setMachineFilled(
        new Set<JpDraftField>(
          jp.why_this_works_jp
            ? JP_DRAFT_FIELDS
            : JP_DRAFT_FIELDS.filter((f) => f !== 'why_this_works_jp'),
        ),
      );
    } catch {
      setAssistError('Translate assist failed.');
    } finally {
      setTranslating(false);
    }
  }

  const jpTag = (field: JpDraftField) =>
    machineFilled.has(field) ? (
      <span className="ml-2 text-[11px] font-semibold text-[color:var(--accent-gold)]">
        machine translated
      </span>
    ) : null;

  return (
    <div className="max-w-[1100px] space-y-6">
      <a
        href="/admin/workbench"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-fg-tertiary hover:text-fg-secondary"
      >
        <ArrowLeft size={15} /> All scenarios
      </a>

      <h1 className="text-[clamp(20px,2.4vw,26px)] font-bold text-fg-primary tracking-[-0.02em]">
        {isCreate ? 'New Scenario' : draft.title_en || 'Untitled scenario'}
      </h1>

      {message && (
        <div className="rounded-lg border border-border-default bg-bg-secondary px-4 py-2.5 text-[13px] text-fg-secondary">
          {message}
        </div>
      )}
      {assistError && (
        <div className="rounded-lg border border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          {assistError}
        </div>
      )}
      {aiDrafted && (
        <div className="rounded-lg border border-[color:var(--accent-teal)]/30 bg-[color:var(--accent-teal-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          AI draft — review everything before saving. The expert output was
          AI-imagined; consider regenerating it with a real executor below.
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-6">
          {isCreate && (
            <AdminWorkbenchDraftAssist
              hasExistingContent={
                draft.title_en.trim() !== '' || draft.brief_en.trim() !== ''
              }
              onApply={applyAiDraft}
            />
          )}
          {/* ── Basics ── */}
          <Section title="Basics">
            <div className="grid sm:grid-cols-3 gap-4">
              <Labeled label="Slug">
                <input
                  className={inputCls}
                  value={draft.slug}
                  onChange={(e) => set('slug', e.target.value)}
                  placeholder="launch-copy-hero"
                />
              </Labeled>
              <Labeled label="Domain">
                <select
                  className={inputCls}
                  value={draft.domain}
                  onChange={(e) => set('domain', e.target.value as WorkbenchDomain)}
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
                  value={draft.difficulty}
                  onChange={(e) =>
                    set('difficulty', e.target.value as WorkbenchDifficulty)
                  }
                >
                  {WORKBENCH_DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Labeled>
            </div>

            <div>
              <span className={labelCls}>Applicable dimensions</span>
              <div className="flex flex-wrap gap-2">
                {WORKBENCH_DIMENSIONS.map((dim) => {
                  const on = draft.applicable_dimensions.includes(dim);
                  return (
                    <button
                      key={dim}
                      type="button"
                      onClick={() => toggleDimension(dim)}
                      className={`px-3 py-1.5 rounded-lg border text-[13px] font-medium capitalize transition-colors ${
                        on
                          ? 'bg-accent-teal/10 border-accent-teal text-accent-teal'
                          : 'bg-bg-primary border-border-default text-fg-tertiary hover:text-fg-secondary'
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
          </Section>

          {/* ── English content ── */}
          <Section title="English content">
            <Labeled label="Title (EN)">
              <input
                className={inputCls}
                value={draft.title_en}
                onChange={(e) => set('title_en', e.target.value)}
              />
            </Labeled>
            <Labeled label="Brief (EN)">
              <textarea
                className={inputCls}
                rows={4}
                value={draft.brief_en}
                onChange={(e) => set('brief_en', e.target.value)}
              />
            </Labeled>
            <Labeled label="Expert prompt (EN)">
              <textarea
                className={inputCls}
                rows={5}
                value={draft.expert_prompt_en}
                onChange={(e) => set('expert_prompt_en', e.target.value)}
              />
            </Labeled>
            <Labeled label="Expert output (EN)">
              <textarea
                className={inputCls}
                rows={5}
                value={draft.expert_output_en}
                onChange={(e) => set('expert_output_en', e.target.value)}
              />
            </Labeled>
            <GenerateOutputRow
              models={availableModels}
              disabled={draft.expert_prompt_en.trim() === ''}
              hasOutput={draft.expert_output_en.trim() !== ''}
              onGenerated={(text) => set('expert_output_en', text)}
              getPrompt={() => draft.expert_prompt_en}
              onError={setAssistError}
            />
            <Labeled label="Why this works (EN) — optional">
              <textarea
                className={inputCls}
                rows={3}
                value={draft.why_this_works_en}
                onChange={(e) => set('why_this_works_en', e.target.value)}
              />
            </Labeled>
          </Section>

          {/* ── Japanese content ── */}
          <Section
            title="Japanese content"
            action={
              <button
                type="button"
                onClick={handleTranslate}
                disabled={translating || !canTranslate}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-bg-primary border border-border-default text-fg-secondary text-[12.5px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors"
                title={
                  canTranslate
                    ? 'Machine-translate the English fields (requires review before publish)'
                    : 'Fill the English title, brief, expert prompt, and expert output first'
                }
              >
                {translating ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Languages size={13} />
                )}
                {translating ? 'Translating…' : 'Translate from EN'}
              </button>
            }
          >
            {draft.jp_needs_review && (
              <div className="rounded-lg border border-[color:var(--accent-gold)]/40 bg-[color:var(--accent-gold-subtle)] px-4 py-3 space-y-2">
                <p className="text-[13px] text-fg-secondary leading-[1.5]">
                  The Japanese fields were machine-translated. Review each one,
                  then mark JP as reviewed — publishing is blocked until then.
                </p>
                <button
                  type="button"
                  onClick={markJpReviewed}
                  className="text-[13px] font-semibold text-[color:var(--accent-teal)] hover:underline"
                >
                  Mark JP as reviewed
                </button>
              </div>
            )}
            <Labeled label={<>Title (JP){jpTag('title_jp')}</>}>
              <input
                className={inputCls}
                value={draft.title_jp}
                onChange={(e) => setJpField('title_jp', e.target.value)}
              />
            </Labeled>
            <Labeled label={<>Brief (JP){jpTag('brief_jp')}</>}>
              <textarea
                className={inputCls}
                rows={4}
                value={draft.brief_jp}
                onChange={(e) => setJpField('brief_jp', e.target.value)}
              />
            </Labeled>
            <Labeled label={<>Expert prompt (JP){jpTag('expert_prompt_jp')}</>}>
              <textarea
                className={inputCls}
                rows={5}
                value={draft.expert_prompt_jp}
                onChange={(e) => setJpField('expert_prompt_jp', e.target.value)}
              />
            </Labeled>
            <Labeled label={<>Expert output (JP){jpTag('expert_output_jp')}</>}>
              <textarea
                className={inputCls}
                rows={5}
                value={draft.expert_output_jp}
                onChange={(e) => setJpField('expert_output_jp', e.target.value)}
              />
            </Labeled>
            {draft.expert_prompt_jp.trim() !== '' && (
              <GenerateOutputRow
                models={availableModels}
                disabled={false}
                hasOutput={draft.expert_output_jp.trim() !== ''}
                onGenerated={(text) => setJpField('expert_output_jp', text)}
                getPrompt={() => draft.expert_prompt_jp}
                onError={setAssistError}
              />
            )}
            <Labeled label={<>Why this works (JP) — optional{jpTag('why_this_works_jp')}</>}>
              <textarea
                className={inputCls}
                rows={3}
                value={draft.why_this_works_jp}
                onChange={(e) => setJpField('why_this_works_jp', e.target.value)}
              />
            </Labeled>
          </Section>
        </div>

        <AdminWorkbenchPublishPanel
          scenario={scenario}
          publishErrors={publishErrors}
          dirty={dirty}
          busy={busy}
          canCreate={canCreate}
          sanitySlot={
            <AdminWorkbenchSanityCheck
              brief={draft.brief_en}
              expertPrompt={draft.expert_prompt_en}
              expertOutput={draft.expert_output_en}
              dimensions={draft.applicable_dimensions}
            />
          }
          onCreate={handleCreate}
          onSave={handleSave}
          onPublish={() => run(() => publishScenario(scenario!.id), 'Published.')}
          onUnpublish={() => run(() => unpublishScenario(scenario!.id), 'Unpublished.')}
          onToggleFeatured={() =>
            run(
              () => setScenarioFeatured(scenario!.id, !scenario!.is_featured),
              scenario!.is_featured ? 'Unfeatured.' : 'Featured.',
            )
          }
          onDelete={() => {
            if (
              window.confirm(
                'Delete this scenario? Member attempts against it are also removed.',
              )
            ) {
              void run(async () => {
                await deleteScenario(scenario!.id);
                router.push('/admin/workbench');
              }, 'Deleted.');
            }
          }}
        />
      </div>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[14px] font-bold text-fg-primary">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * "Generate with executor" assist row: runs the expert prompt through a real
 * executor model and drops the result into the expert-output field.
 */
function GenerateOutputRow({
  models,
  disabled,
  hasOutput,
  getPrompt,
  onGenerated,
  onError,
}: {
  models: WorkbenchExecutorModel[];
  disabled: boolean;
  hasOutput: boolean;
  getPrompt: () => string;
  onGenerated: (text: string) => void;
  onError: (message: string) => void;
}) {
  const [model, setModel] = useState<WorkbenchExecutorModel>(
    models[0] ?? 'claude-haiku',
  );
  const [busy, setBusy] = useState(false);

  if (models.length === 0) return null;

  async function handleGenerate() {
    if (
      hasOutput &&
      !window.confirm('Generating will replace the current expert output. Continue?')
    ) {
      return;
    }
    setBusy(true);
    onError('');
    try {
      const res = await fetch('/api/admin/workbench/expert-output', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: getPrompt(), model }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? 'Expert-output generation failed.');
        return;
      }
      onGenerated(data.outputText as string);
    } catch {
      onError('Expert-output generation failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap -mt-2">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={busy || disabled}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-bg-primary border border-border-default text-fg-secondary text-[12.5px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors"
        title="Run the expert prompt through a real executor model"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
        {busy ? 'Generating…' : 'Generate with executor'}
      </button>
      <select
        value={model}
        onChange={(e) => setModel(e.target.value as WorkbenchExecutorModel)}
        className="h-8 px-2 text-[12.5px] rounded-lg bg-bg-primary border border-border-default text-fg-secondary font-medium focus:outline-none focus:border-accent-teal cursor-pointer"
      >
        {models.map((m) => (
          <option key={m} value={m}>
            {EXECUTOR_MODELS[m].label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Labeled({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}
