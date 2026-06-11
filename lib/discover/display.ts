// Human-readable rendering of stored answers, for the review + summary screens.
// Shared so both present answers identically. Pure (no server-only imports).

import {
  QUESTIONS,
  BRANCHES,
  DECIDE_SENTINEL,
  EXPLORE_SENTINEL,
  type QuestionDef,
} from '@/lib/questions';
import { optionLabel, optionLabels, labelizeTimeline } from './labels';

const ALL_QUESTIONS: QuestionDef[] = [...QUESTIONS, ...BRANCHES.map((b) => b.question)];

export interface AnswerSummaryItem {
  id: string;
  step: number;
  headline: string;
  display: string;
}

interface UrlRow {
  url: string;
  note: string;
}
interface EntryRow {
  name: string;
  desc: string;
}
interface RealDetailsValue {
  details?: string;
  timeline?: string;
}

function formatAnswer(q: QuestionDef, value: unknown): string {
  if (value === DECIDE_SENTINEL) return 'You’d like us to decide';
  if (value === EXPLORE_SENTINEL) return 'You’d like to explore a few options';

  switch (q.type) {
    case 'single':
    case 'text':
    case 'text-chips':
      return typeof value === 'string' ? optionLabel(q.capturesField, value) : '';
    case 'multi':
    case 'page-selector':
    case 'feature-groups':
      return Array.isArray(value)
        ? optionLabels(q.capturesField, value as string[]).join(', ')
        : '';
    case 'repeatable-url':
      return Array.isArray(value)
        ? (value as UrlRow[])
            .filter((r) => r.url)
            .map((r) => (r.note ? `${r.url} (${r.note})` : r.url))
            .join('; ')
        : '';
    case 'multi-entry':
      return Array.isArray(value)
        ? (value as EntryRow[])
            .filter((r) => r.name)
            .map((r) => (r.desc ? `${r.name} — ${r.desc}` : r.name))
            .join('; ')
        : '';
    case 'real-details': {
      const v = value as RealDetailsValue | undefined;
      const parts: string[] = [];
      if (v?.details) parts.push(v.details);
      if (v?.timeline) parts.push(`Timeline: ${labelizeTimeline(v.timeline) ?? v.timeline}`);
      return parts.join(' · ');
    }
    default:
      return typeof value === 'string' ? value : '';
  }
}

/** Produce a display list of answered questions, skipping blanks. */
export function summarizeAnswers(answers: Record<string, unknown>): AnswerSummaryItem[] {
  const items: AnswerSummaryItem[] = [];
  for (const q of ALL_QUESTIONS) {
    const value = answers[q.capturesField];
    if (value === undefined || value === null || value === '') continue;
    const display = formatAnswer(q, value);
    if (!display) continue;
    items.push({ id: q.id, step: q.step, headline: q.headline, display });
  }
  return items;
}
