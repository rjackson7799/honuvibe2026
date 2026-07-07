'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Play, Loader2, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { EXECUTOR_MODELS } from '@/lib/workbench/models';
import { WorkbenchUsageMeter } from './WorkbenchUsageMeter';
import { WorkbenchRubricPanel } from './WorkbenchRubricPanel';
import { WorkbenchCompareReveal } from './WorkbenchCompareReveal';
import { WorkbenchVersionHistory } from './WorkbenchVersionHistory';
import type {
  WorkbenchAttempt,
  WorkbenchDifficulty,
  WorkbenchDimension,
  WorkbenchDomain,
  WorkbenchEvaluatorResult,
  WorkbenchExecutorModel,
  WorkbenchExpertContent,
  WorkbenchScores,
  WorkbenchUsage,
  WorkbenchWorkspaceScenario,
} from '@/lib/workbench/types';

const MAX_PROMPT_CHARS = 4000;
const MODEL_STORAGE_KEY = 'workbench-executor-model';

const btnPrimary =
  'inline-flex items-center gap-2 h-11 px-5 rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[14px] font-semibold disabled:opacity-50 transition-all';
const btnGhost =
  'inline-flex items-center gap-2 h-11 px-4 rounded-[10px] bg-bg-secondary border border-border-default text-fg-secondary text-[14px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors';

const domainStyle: Record<WorkbenchDomain, string> = {
  marketing: 'bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)]',
  operations: 'bg-[color:var(--accent-gold-subtle)] text-[color:var(--accent-gold)]',
  communication: 'bg-[color:var(--accent-purple-subtle)] text-[color:var(--accent-purple)]',
};
const difficultyStyle: Record<WorkbenchDifficulty, string> = {
  beginner: 'bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)]',
  intermediate: 'bg-[color:var(--accent-coral-subtle)] text-[color:var(--accent-coral)]',
  advanced: 'bg-[color:var(--accent-purple-subtle)] text-[color:var(--accent-purple)]',
};

type Props = {
  scenario: WorkbenchWorkspaceScenario;
  initialAttempts: WorkbenchAttempt[];
  availableModels: WorkbenchExecutorModel[];
  initialUsage: WorkbenchUsage;
  initialExpert: WorkbenchExpertContent | null;
};

export function WorkbenchWorkspace({
  scenario,
  initialAttempts,
  availableModels,
  initialUsage,
  initialExpert,
}: Props) {
  const locale = useLocale();
  const t = useTranslations('workbench');
  const language = locale === 'ja' ? 'ja' : 'en';

  const title = locale === 'ja' && scenario.title_jp ? scenario.title_jp : scenario.title_en;
  const brief = locale === 'ja' && scenario.brief_jp ? scenario.brief_jp : scenario.brief_en;

  const newest = initialAttempts[0] ?? null; // server returns newest-first
  const [attempts, setAttempts] = useState<WorkbenchAttempt[]>(initialAttempts);
  const [viewed, setViewed] = useState<WorkbenchAttempt | null>(newest);
  const [promptText, setPromptText] = useState<string>(newest?.prompt_text ?? '');
  const [model, setModel] = useState<WorkbenchExecutorModel>(
    availableModels[0] ?? 'claude-haiku',
  );
  const [usage, setUsage] = useState<WorkbenchUsage>(initialUsage);
  const [expert, setExpert] = useState<WorkbenchExpertContent | null>(initialExpert);
  const [freshDimensions, setFreshDimensions] = useState<WorkbenchEvaluatorResult | null>(null);

  const [running, setRunning] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState('');

  // Restore the persisted executor choice (cheap cross-session convenience).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(MODEL_STORAGE_KEY);
      if (saved && availableModels.includes(saved as WorkbenchExecutorModel)) {
        setModel(saved as WorkbenchExecutorModel);
      }
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, [availableModels]);

  useEffect(() => {
    trackEvent('workbench_open', { scenario: scenario.slug });
  }, [scenario.slug]);

  const refreshUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/workbench/usage');
      if (res.ok) setUsage((await res.json()) as WorkbenchUsage);
    } catch {
      /* keep the optimistic meter on a transient failure */
    }
  }, []);

  function onModelChange(m: WorkbenchExecutorModel) {
    setModel(m);
    try {
      window.localStorage.setItem(MODEL_STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
  }

  const runsLeft = usage.runs.cap - usage.runs.used;
  const scoresLeft = usage.scores.cap - usage.scores.used;
  const overLength = promptText.length > MAX_PROMPT_CHARS;
  const canScore = !!viewed && !viewed.scored_at;

  async function handleRun() {
    setError('');
    const text = promptText.trim();
    if (!text) {
      setError(t('ws_empty_prompt'));
      return;
    }
    if (overLength) return;
    if (runsLeft <= 0) {
      setError(t('ws_limit_runs'));
      return;
    }
    if (!availableModels.length) return;

    setRunning(true);
    try {
      const res = await fetch('/api/workbench/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: scenario.id, promptText: text, language, model }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t('ws_run_failed'));
        return;
      }
      const attempt: WorkbenchAttempt = {
        id: data.attemptId,
        user_id: '',
        scenario_id: scenario.id,
        version: data.version,
        language,
        executor_model: model,
        prompt_text: text,
        output_text: data.outputText,
        scores_json: null,
        overall_score: null,
        strengths: null,
        improvements: null,
        expert_revealed_at: null,
        created_at: new Date().toISOString(),
        scored_at: null,
      };
      setAttempts((prev) => [attempt, ...prev]);
      setViewed(attempt);
      setFreshDimensions(null);
      trackEvent('workbench_run', { scenario: scenario.slug, model });
      void refreshUsage();
    } catch {
      setError(t('ws_run_failed'));
    } finally {
      setRunning(false);
    }
  }

  async function handleScore() {
    if (!viewed || viewed.scored_at) return;
    setError('');
    if (scoresLeft <= 0) {
      setError(t('ws_limit_scores'));
      return;
    }
    setScoring(true);
    try {
      const res = await fetch(`/api/workbench/attempts/${viewed.id}/score`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t('ws_score_failed'));
        return;
      }
      const scored: WorkbenchAttempt = {
        ...viewed,
        scores_json: data.scores as WorkbenchScores,
        overall_score: data.overallScore as number,
        strengths: (data.strengths as string[]) ?? [],
        improvements: (data.improvements as string[]) ?? [],
        scored_at: new Date().toISOString(),
      };
      setViewed(scored);
      setAttempts((prev) => prev.map((a) => (a.id === scored.id ? scored : a)));
      setFreshDimensions((data.dimensions as WorkbenchEvaluatorResult) ?? null);
      trackEvent('workbench_score', { scenario: scenario.slug, overall: data.overallScore });
      void refreshUsage();
    } catch {
      setError(t('ws_score_failed'));
    } finally {
      setScoring(false);
    }
  }

  async function handleReveal() {
    if (!viewed) return;
    setError('');
    setRevealing(true);
    try {
      const res = await fetch(`/api/workbench/attempts/${viewed.id}/reveal-expert`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t('ws_reveal_failed'));
        return;
      }
      setExpert(data as WorkbenchExpertContent);
      trackEvent('workbench_expert_reveal', { scenario: scenario.slug });
    } catch {
      setError(t('ws_reveal_failed'));
    } finally {
      setRevealing(false);
    }
  }

  function selectVersion(a: WorkbenchAttempt) {
    setViewed(a);
    setPromptText(a.prompt_text);
    setFreshDimensions(null);
  }

  const domainLabel: Record<WorkbenchDomain, string> = {
    marketing: t('domain_marketing'),
    operations: t('domain_operations'),
    communication: t('domain_communication'),
  };
  const levelLabel: Record<WorkbenchDifficulty, string> = {
    beginner: t('level_beginner'),
    intermediate: t('level_intermediate'),
    advanced: t('level_advanced'),
  };
  const dimLabel: Record<WorkbenchDimension, string> = {
    role: t('dim_role'),
    context: t('dim_context'),
    task: t('dim_task'),
    constraints: t('dim_constraints'),
    format: t('dim_format'),
    examples: t('dim_examples'),
  };

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto">
      <Link
        href="/learn/vault/workbench"
        className="inline-flex items-center gap-1.5 text-[13px] text-fg-tertiary hover:text-fg-secondary"
      >
        ← {t('ws_back')}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            <span
              className={cn(
                'text-[10.5px] font-bold px-2 py-0.5 rounded-full',
                domainStyle[scenario.domain],
              )}
            >
              {domainLabel[scenario.domain]}
            </span>
            <span
              className={cn(
                'text-[10.5px] font-bold px-2 py-0.5 rounded-full',
                difficultyStyle[scenario.difficulty],
              )}
            >
              {levelLabel[scenario.difficulty]}
            </span>
          </div>
          <h1 className="text-[clamp(20px,2.4vw,26px)] font-bold text-fg-primary tracking-[-0.02em]">
            {title}
          </h1>
        </div>
        <WorkbenchUsageMeter usage={usage} />
      </div>

      {/* Brief */}
      <div className="rounded-[14px] border border-border-default bg-bg-secondary p-4">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-fg-tertiary mb-1.5">
          {t('ws_brief')}
        </p>
        <p className="text-[14px] text-fg-secondary leading-[1.6] whitespace-pre-wrap">{brief}</p>
        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          <span className="text-[11px] text-fg-tertiary">{t('ws_scored_on')}:</span>
          {scenario.applicable_dimensions.map((d) => (
            <span
              key={d}
              className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-bg-tertiary text-fg-secondary"
            >
              {dimLabel[d]}
            </span>
          ))}
        </div>
      </div>

      {attempts.length > 0 && (
        <WorkbenchVersionHistory
          attempts={attempts}
          currentId={viewed?.id ?? null}
          onSelect={selectVersion}
        />
      )}

      {/* Editor */}
      <div className="rounded-[14px] border border-border-default bg-bg-secondary p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="text-[13px] font-semibold text-fg-secondary">
            {t('ws_prompt_label')}
          </label>
          {availableModels.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-fg-tertiary">{t('ws_model')}</span>
              <select
                value={model}
                onChange={(e) => onModelChange(e.target.value as WorkbenchExecutorModel)}
                className="px-3 py-1.5 text-[13px] rounded-[10px] bg-bg-primary border border-border-default text-fg-secondary font-medium focus:outline-none focus:border-[color:var(--accent-teal)] cursor-pointer"
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {EXECUTOR_MODELS[m].label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder={t('ws_prompt_placeholder')}
          rows={7}
          className={cn(
            'w-full px-3.5 py-3 rounded-[10px] bg-bg-primary border text-fg-primary text-[16px] leading-[1.55] resize-y focus:outline-none transition-colors',
            overLength ? 'border-[color:var(--accent-coral)]' : 'border-border-default focus:border-[color:var(--accent-teal)]',
          )}
        />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span
            className={cn(
              'text-[12px] tabular-nums',
              overLength ? 'text-[color:var(--accent-coral)] font-semibold' : 'text-fg-tertiary',
            )}
          >
            {promptText.length}/{MAX_PROMPT_CHARS}
          </span>
          <button
            type="button"
            onClick={handleRun}
            disabled={running || overLength || !promptText.trim() || runsLeft <= 0 || !availableModels.length}
            className={btnPrimary}
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {running ? t('ws_running') : t('ws_run')}
          </button>
        </div>

        <p className="text-[11.5px] text-fg-tertiary leading-[1.5]">
          {t('ws_privacy')}{' '}
          <Link href="/legal/ai-usage" className="underline underline-offset-2 hover:text-fg-secondary">
            {t('ws_privacy_link')}
          </Link>
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          {error}
        </div>
      )}

      {/* Output + score */}
      {viewed && (
        <div className="rounded-[14px] border border-border-default bg-bg-secondary p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-fg-tertiary">
              {t('ws_output')} · v{viewed.version} · {EXECUTOR_MODELS[viewed.executor_model].label}
            </p>
            {canScore ? (
              <button
                type="button"
                onClick={handleScore}
                disabled={scoring || scoresLeft <= 0}
                className={btnGhost}
              >
                {scoring ? <Loader2 size={15} className="animate-spin" /> : <ClipboardCheck size={15} />}
                {scoring ? t('ws_scoring') : t('ws_score')}
              </button>
            ) : (
              <span className="text-[12px] text-fg-tertiary">{t('ws_already_scored')}</span>
            )}
          </div>
          <div className="whitespace-pre-wrap text-[13.5px] leading-[1.6] text-fg-secondary bg-bg-primary border border-border-default rounded-[10px] p-3">
            {viewed.output_text}
          </div>

          {viewed.scored_at && viewed.scores_json && viewed.overall_score != null && (
            <WorkbenchRubricPanel
              scores={viewed.scores_json}
              overallScore={viewed.overall_score}
              strengths={viewed.strengths ?? []}
              improvements={viewed.improvements ?? []}
              applicableDimensions={scenario.applicable_dimensions}
              dimensions={freshDimensions}
            />
          )}
        </div>
      )}

      {/* Expert compare / reveal */}
      <WorkbenchCompareReveal
        expert={expert}
        userPrompt={viewed?.prompt_text ?? promptText}
        onReveal={handleReveal}
        revealing={revealing}
        canReveal={attempts.some((a) => a.scored_at != null)}
      />
    </div>
  );
}
