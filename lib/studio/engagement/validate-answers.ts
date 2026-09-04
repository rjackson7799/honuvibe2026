// Answer validation for the client discovery questionnaire — a FORK of
// lib/survey/validate-answers.ts, not an extension of it (that module is
// hard-wired to EN/JP label pairs, has no allow_other channel, and validates a
// whole submission at once). Copied discipline: never trust the client,
// re-derive from the stored manifest, dedupe `multi`.
//
// Three exports, none of which builds a snapshot — the snapshot is built inside
// submit_engagement_questionnaire (migration 067) as the pinned manifest plus
// the raw answers:
//   validateOneAnswer   — the AUTHORITATIVE per-answer validator run by the
//                         autosave route on every write. `required` is NOT
//                         enforced here (a blank is accepted — clearing an
//                         answer is a valid autosave); everything else is.
//   findMissingRequired — the submit route's pre-check, UX only: the RPC
//                         re-checks `required` in SQL and is the enforcement.
//   renderSnapshot      — resolves prompts + option labels from the PINNED
//                         manifest for the admin answers view, the digest and
//                         the brief prompt. Never a live lookup.

import {
  OTHER_LABEL,
  OTHER_TEXT_MAX,
  OTHER_VALUE,
  textCapFor,
  type AnswerSnapshot,
  type AnswerValue,
  type EngagementQuestion,
  type QuestionnaireSection,
  type StoredAnswer,
} from './questions-schema';

export type AnswerValidationError =
  | 'unknown_question'
  | 'too_long'
  | 'invalid_option'
  | 'too_many'
  | 'other_required'
  | 'other_not_allowed';

export type ValidatedAnswer =
  | { ok: true; answer: AnswerValue; other_text: string | null; blank: boolean }
  | { ok: false; error: AnswerValidationError };

function normalizeOther(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * Validate a single answer against its question. Returns the cleaned value to
 * store (trimmed text, deduped multi) or the first error found. `question` may
 * be undefined so callers can pass a Map lookup straight through — that is the
 * `unknown_question` case.
 */
export function validateOneAnswer(
  question: EngagementQuestion | null | undefined,
  raw: unknown,
  otherText: unknown,
): ValidatedAnswer {
  if (!question) return { ok: false, error: 'unknown_question' };
  const other = normalizeOther(otherText);

  if (question.qtype === 'text') {
    if (other !== '') return { ok: false, error: 'other_not_allowed' };
    const s = typeof raw === 'string' ? raw.trim() : '';
    if (s.length > textCapFor(question)) return { ok: false, error: 'too_long' };
    return { ok: true, answer: s, other_text: null, blank: s === '' };
  }

  if (question.qtype === 'single') {
    const s = typeof raw === 'string' ? raw.trim() : '';
    if (s === '') {
      if (other !== '') return { ok: false, error: 'other_not_allowed' };
      return { ok: true, answer: '', other_text: null, blank: true };
    }
    if (s === OTHER_VALUE) {
      if (!question.allow_other) return { ok: false, error: 'invalid_option' };
      if (other === '') return { ok: false, error: 'other_required' };
      if (other.length > OTHER_TEXT_MAX) return { ok: false, error: 'too_long' };
      return { ok: true, answer: OTHER_VALUE, other_text: other, blank: false };
    }
    if (!question.options.some((o) => o.value === s)) return { ok: false, error: 'invalid_option' };
    if (other !== '') return { ok: false, error: 'other_not_allowed' };
    return { ok: true, answer: s, other_text: null, blank: false };
  }

  // multi
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const values: string[] = [];
  for (const v of list) {
    if (typeof v !== 'string') return { ok: false, error: 'invalid_option' };
    const t = v.trim();
    if (t === '' || seen.has(t)) continue;
    if (t === OTHER_VALUE) {
      if (!question.allow_other) return { ok: false, error: 'invalid_option' };
    } else if (!question.options.some((o) => o.value === t)) {
      return { ok: false, error: 'invalid_option' };
    }
    seen.add(t);
    values.push(t);
  }
  if (values.length === 0) {
    if (other !== '') return { ok: false, error: 'other_not_allowed' };
    return { ok: true, answer: [], other_text: null, blank: true };
  }
  if (question.max_select !== null && values.length > question.max_select) {
    return { ok: false, error: 'too_many' };
  }
  const hasOther = values.includes(OTHER_VALUE);
  if (hasOther) {
    if (other === '') return { ok: false, error: 'other_required' };
    if (other.length > OTHER_TEXT_MAX) return { ok: false, error: 'too_long' };
    return { ok: true, answer: values, other_text: other, blank: false };
  }
  if (other !== '') return { ok: false, error: 'other_not_allowed' };
  return { ok: true, answer: values, other_text: null, blank: false };
}

/**
 * "Is this stored answer a real answer?" — the TS twin of
 * public.engagement_answer_is_present (067). A '__other' string counts only
 * with other_text; an array counts when non-empty.
 */
export function isAnswerPresent(answer: AnswerValue | null | undefined, otherText: string | null | undefined): boolean {
  if (answer == null) return false;
  if (Array.isArray(answer)) return answer.length > 0;
  const s = answer.trim();
  if (s === '') return false;
  if (s === OTHER_VALUE) return (otherText ?? '').trim() !== '';
  return true;
}

export interface MissingRequiredGroup {
  section_key: string;
  question_ids: string[];
}

/**
 * Required questions with no present answer, grouped by section in manifest
 * order (so the client can jump to the first one). Non-required questions are
 * never reported. UX only — the RPC is the enforcement.
 */
export function findMissingRequired(
  manifest: { sections: QuestionnaireSection[]; questions: EngagementQuestion[] },
  answers: Iterable<Pick<StoredAnswer, 'question_id' | 'answer' | 'other_text'>>,
): MissingRequiredGroup[] {
  const byId = new Map<string, Pick<StoredAnswer, 'answer' | 'other_text'>>();
  for (const a of answers) byId.set(a.question_id, a);

  const order = manifest.sections.map((s) => s.key);
  const groups = new Map<string, string[]>();
  for (const q of manifest.questions) {
    if (!q.required) continue;
    const a = byId.get(q.id);
    if (a && isAnswerPresent(a.answer, a.other_text)) continue;
    const list = groups.get(q.section_key) ?? [];
    list.push(q.id);
    groups.set(q.section_key, list);
  }

  const known = order.filter((k) => groups.has(k));
  const unknown = [...groups.keys()].filter((k) => !order.includes(k));
  return [...known, ...unknown].map((section_key) => ({
    section_key,
    question_ids: groups.get(section_key)!,
  }));
}

export interface RenderedAnswer {
  question_id: string;
  prompt: string;
  qtype: EngagementQuestion['qtype'];
  required: boolean;
  answered: boolean;
  /** text questions: the trimmed text; choice questions: null */
  text: string | null;
  /** choice questions: the chosen options with labels from the pinned manifest */
  selected: { value: string; label: string }[];
  other_text: string | null;
}

export interface RenderedSection {
  key: string;
  title: string;
  blurb: string | null;
  items: RenderedAnswer[];
}

export interface RenderedSnapshot {
  questions_version: number;
  locale: AnswerSnapshot['locale'];
  title: string;
  sections: RenderedSection[];
}

/**
 * Resolve a pinned snapshot for display: every question in manifest order
 * under its section, with option labels (and the localized "Other") taken from
 * the manifest INSIDE the snapshot. Questions whose section no longer exists in
 * the pinned sections land in a trailing unlabelled section rather than vanish.
 */
export function renderSnapshot(snapshot: AnswerSnapshot): RenderedSnapshot {
  const byId = new Map<string, StoredAnswer>();
  for (const a of snapshot.answers) byId.set(a.question_id, a);
  const otherLabel = OTHER_LABEL[snapshot.locale];

  const items = new Map<string, RenderedAnswer[]>();
  for (const q of snapshot.questions) {
    const a = byId.get(q.id);
    const answered = a ? isAnswerPresent(a.answer, a.other_text) : false;
    let text: string | null = null;
    const selected: { value: string; label: string }[] = [];
    if (a && answered) {
      if (q.qtype === 'text') {
        text = typeof a.answer === 'string' ? a.answer.trim() : '';
      } else {
        const values = Array.isArray(a.answer) ? a.answer : [a.answer];
        for (const v of values) {
          if (v === OTHER_VALUE) {
            selected.push({ value: v, label: otherLabel });
            continue;
          }
          const opt = q.options.find((o) => o.value === v);
          selected.push({ value: v, label: opt?.label ?? v });
        }
      }
    }
    const list = items.get(q.section_key) ?? [];
    list.push({
      question_id: q.id,
      prompt: q.prompt,
      qtype: q.qtype,
      required: q.required,
      answered,
      text,
      selected,
      other_text: a?.other_text ?? null,
    });
    items.set(q.section_key, list);
  }

  const sections: RenderedSection[] = snapshot.sections.map((s) => ({
    key: s.key,
    title: s.title,
    blurb: s.blurb,
    items: items.get(s.key) ?? [],
  }));
  const knownKeys = new Set(snapshot.sections.map((s) => s.key));
  const orphans = [...items.entries()].filter(([k]) => !knownKeys.has(k));
  if (orphans.length > 0) {
    sections.push({
      key: '_unsectioned',
      title: '',
      blurb: null,
      items: orphans.flatMap(([, list]) => list),
    });
  }

  return {
    questions_version: snapshot.questions_version,
    locale: snapshot.locale,
    title: snapshot.title,
    sections,
  };
}
