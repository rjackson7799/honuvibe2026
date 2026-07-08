/**
 * Server-side answer validation + snapshot, shared by the event and course
 * submit routes. Re-derives validity from the DB manifest — never trusts the
 * client. The snapshot pins prompt + chosen option labels at submit time so the
 * summary survives later question edits.
 */
import type { EventSurveyQuestion } from '@/lib/survey/event-surveys';

const MAX_TEXT = 2000;

export type SnapshotItem =
  | { question_id: string; prompt_en: string; prompt_jp: string; qtype: 'text'; text: string }
  | {
      question_id: string;
      prompt_en: string;
      prompt_jp: string;
      qtype: 'single' | 'multi';
      selected: { value: string; label_en: string; label_jp: string }[];
    };

export type ValidatedAnswers =
  | { ok: true; clean: Record<string, string | string[]>; snapshot: SnapshotItem[] }
  | { ok: false; error: string };

export function validateAndSnapshot(
  questions: EventSurveyQuestion[],
  answers: Record<string, string | string[]>,
): ValidatedAnswers {
  const byId = new Map(questions.map((q) => [q.id, q]));
  for (const key of Object.keys(answers)) {
    if (!byId.has(key)) return { ok: false, error: 'unknown_question' };
  }

  const clean: Record<string, string | string[]> = {};
  const snapshot: SnapshotItem[] = [];

  for (const q of questions) {
    const raw = answers[q.id];

    if (q.qtype === 'text') {
      const s = typeof raw === 'string' ? raw.trim() : '';
      if (!s) {
        if (q.required) return { ok: false, error: 'required' };
        continue;
      }
      if (s.length > MAX_TEXT) return { ok: false, error: 'too_long' };
      clean[q.id] = s;
      snapshot.push({ question_id: q.id, prompt_en: q.promptEn, prompt_jp: q.promptJp, qtype: 'text', text: s });
      continue;
    }

    if (q.qtype === 'single') {
      const s = typeof raw === 'string' ? raw : '';
      if (!s) {
        if (q.required) return { ok: false, error: 'required' };
        continue;
      }
      const opt = q.options.find((o) => o.value === s);
      if (!opt) return { ok: false, error: 'invalid_option' };
      clean[q.id] = s;
      snapshot.push({
        question_id: q.id,
        prompt_en: q.promptEn,
        prompt_jp: q.promptJp,
        qtype: 'single',
        selected: [{ value: opt.value, label_en: opt.labelEn, label_jp: opt.labelJp }],
      });
      continue;
    }

    // multi
    const arr = Array.isArray(raw) ? [...new Set(raw)] : [];
    if (arr.length === 0) {
      if (q.required) return { ok: false, error: 'required' };
      continue;
    }
    if (q.maxSelect && arr.length > q.maxSelect) return { ok: false, error: 'too_many' };
    const selected: { value: string; label_en: string; label_jp: string }[] = [];
    for (const v of arr) {
      const opt = q.options.find((o) => o.value === v);
      if (!opt) return { ok: false, error: 'invalid_option' };
      selected.push({ value: opt.value, label_en: opt.labelEn, label_jp: opt.labelJp });
    }
    clean[q.id] = arr;
    snapshot.push({ question_id: q.id, prompt_en: q.promptEn, prompt_jp: q.promptJp, qtype: 'multi', selected });
  }

  return { ok: true, clean, snapshot };
}
