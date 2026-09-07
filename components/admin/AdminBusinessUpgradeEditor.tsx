'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { saveBusinessUpgradeProject } from '@/lib/business-upgrades/admin-actions';
import {
  AI_CONFIDENCE_LEVELS,
  BUSINESS_GOALS,
  INDUSTRIES,
  WORK_MODELS,
  type AiConfidence,
  type BusinessGoal,
  type BusinessUpgradeStepType,
  type ImprovementDirection,
  type Industry,
  type MetricValueType,
  type WorkModel,
} from '@/lib/business-upgrades/codes';
import type {
  BusinessUpgradeAuthoringResource,
  BusinessUpgradeProjectEditorRow,
} from '@/lib/business-upgrades/types';
import type {
  BusinessUpgradeProjectInput,
  BusinessUpgradeProjectStepInput,
} from '@/lib/business-upgrades/schemas';

const fieldBaseClass =
  'w-full rounded-lg border border-border-default px-3 py-2.5 text-sm text-fg-primary shadow-sm outline-none transition-colors placeholder:text-fg-tertiary hover:border-border-hover focus:border-accent-teal focus:ring-2 focus:ring-accent-teal/15';
const inputClass = `${fieldBaseClass} bg-bg-primary`;
const stepInputClass = `${fieldBaseClass} bg-bg-secondary`;
const labelClass = 'mb-1.5 block text-[13px] font-medium text-fg-secondary';

function blankStep(
  order: number,
  stepType: BusinessUpgradeStepType = 'action',
): BusinessUpgradeProjectStepInput {
  return {
    sortOrder: order,
    stepType,
    measurementKind: stepType === 'measurement' ? 'baseline' : null,
    titleEn: '',
    titleJa: '',
    instructionsEn: '',
    instructionsJa: '',
    contentItemId: null,
    workbenchScenarioId: null,
    estimatedMinutes: 15,
    required: true,
  };
}

function initialForm(project?: BusinessUpgradeProjectEditorRow): BusinessUpgradeProjectInput {
  if (!project) {
    return {
      slug: '',
      titleEn: '',
      titleJa: '',
      descriptionEn: '',
      descriptionJa: '',
      outcomeEn: '',
      outcomeJa: '',
      deliverableEn: '',
      deliverableJa: '',
      metricLabelEn: '',
      metricLabelJa: '',
      metricUnit: '',
      metricValueType: 'number',
      metricMin: 0,
      metricMax: 1000000,
      improvementDirection: 'increase',
      goalCodes: ['save_time'],
      workModelCodes: null,
      industryCodes: null,
      minConfidence: 'beginner',
      maxConfidence: 'advanced',
      estimatedDays: 7,
      totalMinutes: 90,
      featured: false,
      jpNeedsReview: true,
      steps: [
        { ...blankStep(1, 'measurement'), measurementKind: 'baseline' },
        blankStep(2),
        { ...blankStep(3, 'measurement'), measurementKind: 'result' },
      ],
    };
  }

  return {
    id: project.id,
    slug: project.slug,
    titleEn: project.title_en,
    titleJa: project.title_ja,
    descriptionEn: project.description_en,
    descriptionJa: project.description_ja,
    outcomeEn: project.outcome_en,
    outcomeJa: project.outcome_ja,
    deliverableEn: project.deliverable_en,
    deliverableJa: project.deliverable_ja,
    metricLabelEn: project.metric_label_en,
    metricLabelJa: project.metric_label_ja,
    metricUnit: project.metric_unit,
    metricValueType: project.metric_value_type,
    metricMin: Number(project.metric_min),
    metricMax: Number(project.metric_max),
    improvementDirection: project.improvement_direction,
    goalCodes: project.goal_codes,
    workModelCodes: project.work_model_codes,
    industryCodes: project.industry_codes,
    minConfidence: project.min_confidence,
    maxConfidence: project.max_confidence,
    estimatedDays: project.estimated_days,
    totalMinutes: project.total_minutes,
    featured: project.featured,
    jpNeedsReview: project.jp_needs_review,
    steps: [...(project.business_upgrade_project_steps ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((step) => ({
        sortOrder: step.sort_order,
        stepType: step.step_type,
        measurementKind: step.measurement_kind,
        titleEn: step.title_en,
        titleJa: step.title_ja,
        instructionsEn: step.instructions_en,
        instructionsJa: step.instructions_ja,
        contentItemId: step.content_item_id,
        workbenchScenarioId: step.workbench_scenario_id,
        estimatedMinutes: step.estimated_minutes,
        required: step.required,
      })),
  };
}

export function AdminBusinessUpgradeEditor({
  project,
  resources,
  scenarios,
}: {
  project?: BusinessUpgradeProjectEditorRow;
  resources: BusinessUpgradeAuthoringResource[];
  scenarios: BusinessUpgradeAuthoringResource[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [form, setForm] = useState<BusinessUpgradeProjectInput>(() => initialForm(project));

  function set<K extends keyof BusinessUpgradeProjectInput>(
    key: K,
    value: BusinessUpgradeProjectInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setStep<K extends keyof BusinessUpgradeProjectStepInput>(
    index: number,
    key: K,
    value: BusinessUpgradeProjectStepInput[K],
  ) {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) =>
        stepIndex === index ? { ...step, [key]: value } : step,
      ),
    }));
  }

  function setStepType(index: number, stepType: BusinessUpgradeStepType) {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) =>
        stepIndex === index
          ? {
              ...step,
              stepType,
              measurementKind: stepType === 'measurement' ? 'baseline' : null,
              contentItemId: null,
              workbenchScenarioId: null,
            }
          : step,
      ),
    }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    startTransition(async () => {
      try {
        const result = await saveBusinessUpgradeProject({
          ...form,
          steps: form.steps.map((step, index) => ({ ...step, sortOrder: index + 1 })),
        });
        router.push(`/admin/business-upgrades/${result.projectId}`);
        router.refresh();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Save failed');
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section
        title="Project basics"
        description="Name the upgrade and explain the result members will create."
      >
        <Field label="Slug" hint="Lowercase words separated by hyphens.">
          <input
            value={form.slug}
            onChange={(event) => set('slug', event.target.value)}
            className={inputClass}
            placeholder="improve-customer-follow-up"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title EN">
            <input
              value={form.titleEn}
              onChange={(event) => set('titleEn', event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Title JA">
            <input
              value={form.titleJa}
              onChange={(event) => set('titleJa', event.target.value)}
              className={inputClass}
              lang="ja"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Member-facing content"
        description="Keep both language versions aligned around the same outcome and deliverable."
      >
        <BilingualTextArea
          label="Description"
          valueEn={form.descriptionEn}
          valueJa={form.descriptionJa}
          onChangeEn={(value) => set('descriptionEn', value)}
          onChangeJa={(value) => set('descriptionJa', value)}
        />
        <BilingualTextArea
          label="Outcome"
          valueEn={form.outcomeEn}
          valueJa={form.outcomeJa}
          onChangeEn={(value) => set('outcomeEn', value)}
          onChangeJa={(value) => set('outcomeJa', value)}
        />
        <BilingualTextArea
          label="Deliverable"
          valueEn={form.deliverableEn}
          valueJa={form.deliverableJa}
          onChangeEn={(value) => set('deliverableEn', value)}
          onChangeJa={(value) => set('deliverableJa', value)}
        />
      </Section>

      <Section
        title="Success measurement"
        description="Define the before-and-after number members will use to prove improvement."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Metric label EN">
            <input
              value={form.metricLabelEn}
              onChange={(event) => set('metricLabelEn', event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Metric label JA">
            <input
              value={form.metricLabelJa}
              onChange={(event) => set('metricLabelJa', event.target.value)}
              className={inputClass}
              lang="ja"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Metric unit">
            <input
              value={form.metricUnit}
              onChange={(event) => set('metricUnit', event.target.value)}
              className={inputClass}
              placeholder="minutes"
            />
          </Field>
          <Field label="Value type">
            <select
              value={form.metricValueType}
              onChange={(event) => set('metricValueType', event.target.value as MetricValueType)}
              className={inputClass}
            >
              {['number', 'minutes', 'percentage', 'currency'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Field label="Improvement direction">
            <select
              value={form.improvementDirection}
              onChange={(event) =>
                set('improvementDirection', event.target.value as ImprovementDirection)
              }
              className={inputClass}
            >
              <option value="increase">Increase</option>
              <option value="decrease">Decrease</option>
            </select>
          </Field>
          <Field label="Minimum value">
            <input
              type="number"
              value={form.metricMin}
              onChange={(event) => set('metricMin', Number(event.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Maximum value">
            <input
              type="number"
              value={form.metricMax}
              onChange={(event) => set('metricMax', Number(event.target.value))}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Audience and effort"
        description="These settings decide when the project appears in a member's recommendations."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Primary goal">
            <select
              value={form.goalCodes[0]}
              onChange={(event) => set('goalCodes', [event.target.value as BusinessGoal])}
              className={inputClass}
            >
              {BUSINESS_GOALS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Field label="Work model">
            <select
              value={form.workModelCodes?.[0] ?? 'any'}
              onChange={(event) =>
                set(
                  'workModelCodes',
                  event.target.value === 'any' ? null : [event.target.value as WorkModel],
                )
              }
              className={inputClass}
            >
              <option value="any">Any work model</option>
              {WORK_MODELS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Field label="Industry">
            <select
              value={form.industryCodes?.[0] ?? 'any'}
              onChange={(event) =>
                set(
                  'industryCodes',
                  event.target.value === 'any' ? null : [event.target.value as Industry],
                )
              }
              className={inputClass}
            >
              <option value="any">Any industry</option>
              {INDUSTRIES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Field label="Minimum AI confidence">
            <select
              value={form.minConfidence}
              onChange={(event) => set('minConfidence', event.target.value as AiConfidence)}
              className={inputClass}
            >
              {AI_CONFIDENCE_LEVELS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Field label="Maximum AI confidence">
            <select
              value={form.maxConfidence}
              onChange={(event) => set('maxConfidence', event.target.value as AiConfidence)}
              className={inputClass}
            >
              {AI_CONFIDENCE_LEVELS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Field label="Estimated days">
            <input
              type="number"
              value={form.estimatedDays}
              onChange={(event) => set('estimatedDays', Number(event.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Total active minutes">
            <input
              type="number"
              value={form.totalMinutes}
              onChange={(event) => set('totalMinutes', Number(event.target.value))}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Project steps"
        description="Begin with a baseline measurement and finish with a result measurement."
        action={
          <button
            type="button"
            onClick={() => set('steps', [...form.steps, blankStep(form.steps.length + 1)])}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border-default bg-bg-primary px-3 text-sm font-semibold text-accent-teal transition-colors hover:border-accent-teal"
          >
            <Plus size={16} aria-hidden="true" /> Add step
          </button>
        }
      >
        <div className="space-y-4">
          {form.steps.map((step, index) => (
            <div
              key={index}
              className="rounded-xl border border-border-default bg-bg-tertiary p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-semibold text-fg-primary">Step {index + 1}</h3>
                <button
                  type="button"
                  onClick={() =>
                    set(
                      'steps',
                      form.steps.filter((_, stepIndex) => stepIndex !== index),
                    )
                  }
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-accent-coral transition-colors hover:bg-accent-coral/10"
                >
                  <Trash2 size={14} aria-hidden="true" /> Remove
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Step type">
                  <select
                    value={step.stepType}
                    onChange={(event) =>
                      setStepType(index, event.target.value as BusinessUpgradeStepType)
                    }
                    className={stepInputClass}
                  >
                    {['vault', 'workbench', 'action', 'measurement'].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </Field>

                {step.stepType === 'measurement' && (
                  <Field label="Measurement point">
                    <select
                      value={step.measurementKind ?? 'baseline'}
                      onChange={(event) =>
                        setStep(
                          index,
                          'measurementKind',
                          event.target.value as 'baseline' | 'result',
                        )
                      }
                      className={stepInputClass}
                    >
                      <option value="baseline">Baseline</option>
                      <option value="result">Result</option>
                    </select>
                  </Field>
                )}

                {step.stepType === 'vault' && (
                  <Field label="Vault resource">
                    <select
                      value={step.contentItemId ?? ''}
                      onChange={(event) =>
                        setStep(index, 'contentItemId', event.target.value || null)
                      }
                      className={stepInputClass}
                    >
                      <option value="">Choose resource</option>
                      {resources.map((resource) => (
                        <option key={resource.id} value={resource.id}>
                          {resource.title_en}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                {step.stepType === 'workbench' && (
                  <Field label="Workbench scenario">
                    <select
                      value={step.workbenchScenarioId ?? ''}
                      onChange={(event) =>
                        setStep(index, 'workbenchScenarioId', event.target.value || null)
                      }
                      className={stepInputClass}
                    >
                      <option value="">Choose scenario</option>
                      {scenarios.map((scenario) => (
                        <option key={scenario.id} value={scenario.id}>
                          {scenario.title_en}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                <Field label="Estimated minutes">
                  <input
                    type="number"
                    value={step.estimatedMinutes}
                    onChange={(event) =>
                      setStep(index, 'estimatedMinutes', Number(event.target.value))
                    }
                    className={stepInputClass}
                  />
                </Field>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Step title EN">
                  <input
                    value={step.titleEn}
                    onChange={(event) => setStep(index, 'titleEn', event.target.value)}
                    className={stepInputClass}
                  />
                </Field>
                <Field label="Step title JA">
                  <input
                    value={step.titleJa}
                    onChange={(event) => setStep(index, 'titleJa', event.target.value)}
                    className={stepInputClass}
                    lang="ja"
                  />
                </Field>
                <Field label="Instructions EN">
                  <textarea
                    value={step.instructionsEn}
                    onChange={(event) => setStep(index, 'instructionsEn', event.target.value)}
                    rows={4}
                    className={stepInputClass}
                  />
                </Field>
                <Field label="Instructions JA">
                  <textarea
                    value={step.instructionsJa}
                    onChange={(event) => setStep(index, 'instructionsJa', event.target.value)}
                    rows={4}
                    className={stepInputClass}
                    lang="ja"
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Publishing checks">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
          <CheckField
            checked={form.featured}
            onChange={(checked) => set('featured', checked)}
            label="Feature this project"
          />
          <CheckField
            checked={!form.jpNeedsReview}
            onChange={(checked) => set('jpNeedsReview', !checked)}
            label="Native Japanese review complete"
          />
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border-default bg-bg-secondary p-4">
        <button
          disabled={pending}
          className="min-h-11 rounded-xl bg-accent-teal px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-teal/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save draft'}
        </button>
        <p className="text-xs text-fg-tertiary">Saving never publishes the project automatically.</p>
        {error && <p className="w-full text-sm font-medium text-accent-coral">{error}</p>}
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border-default bg-bg-secondary p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-default pb-4">
        <div>
          <h2 className="text-lg font-bold text-fg-primary">{title}</h2>
          {description && <p className="mt-1 text-sm text-fg-secondary">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-fg-tertiary">{hint}</span>}
    </label>
  );
}

function BilingualTextArea({
  label,
  valueEn,
  valueJa,
  onChangeEn,
  onChangeJa,
}: {
  label: string;
  valueEn: string;
  valueJa: string;
  onChangeEn: (value: string) => void;
  onChangeJa: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={`${label} EN`}>
        <textarea
          value={valueEn}
          onChange={(event) => onChangeEn(event.target.value)}
          rows={4}
          className={inputClass}
        />
      </Field>
      <Field label={`${label} JA`}>
        <textarea
          value={valueJa}
          onChange={(event) => onChangeJa(event.target.value)}
          rows={4}
          className={inputClass}
          lang="ja"
        />
      </Field>
    </div>
  );
}

function CheckField({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-fg-primary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-border-default accent-accent-teal"
      />
      {label}
    </label>
  );
}
