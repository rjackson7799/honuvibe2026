// The tailoring merge — a PURE function, the most bug-prone piece of the AI
// path and the most testable. The model emits NO ids, positions, locale or
// status (the Blue Filler `slug` lesson): this function assigns them.
//
// Rules (plan, "C1 · Tailoring"):
//   - a template question the model neither returns nor drops is KEPT — never
//     silently lose one; drops must be explicit;
//   - explicit drops are honored, but > MAX_DROP_RATIO of the template
//     questions dropped rejects the whole output as a misunderstanding;
//   - coherence is repaired in code: long / allow_other forced false off-type,
//     max_select clamped to options.length (+1 for Other), duplicate option
//     values deduped (first wins), a choice question with < 2 options is
//     downgraded to text;
//   - the result always lands at status='draft' (the RPC enforces it too).
//
// Order: sections in the base (template) order; within a section, the model's
// questions in the order it returned them, then any unmentioned template
// questions in template order.

import {
  MAX_OPTIONS,
  MAX_QUESTIONS,
  OTHER_VALUE,
  questionnaireManifestSchema,
  type EngagementQuestion,
  type QuestionOption,
  type QuestionnaireSection,
} from './questions-schema';

export const MAX_DROP_RATIO = 0.4;

/** What the tool schema lets the model emit per question. No id, no position. */
export interface TailoredQuestionInput {
  /** '' for a new question; a template question id to edit that question in place. */
  template_question_id: string;
  section_key: string;
  qtype: 'single' | 'multi' | 'text';
  prompt: string;
  /** '' means no help text. */
  help: string;
  required: boolean;
  options: { value: string; label: string }[];
  allow_other: boolean;
  /** 0 means no cap. Strict mode has no nullable/min/max, so 0 is the sentinel. */
  max_select: number;
  long: boolean;
}

export interface TailorOutput {
  section_blurbs: { key: string; blurb: string }[];
  questions: TailoredQuestionInput[];
  dropped_template_question_ids: string[];
}

export type MergeResult =
  | {
      ok: true;
      sections: QuestionnaireSection[];
      questions: EngagementQuestion[];
      dropped: string[];
      kept_unmentioned: string[];
      added: string[];
      /** Literal: a tailored manifest is always a draft. */
      status: 'draft';
    }
  | { ok: false; error: 'too_many_dropped' | 'malformed_output'; detail: string };

function slugValue(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '')
    .slice(0, 80);
}

/** Dedupe by value (first wins), drop the reserved sentinel and blanks, cap at MAX_OPTIONS. */
function repairOptions(options: { value: string; label: string }[]): QuestionOption[] {
  const seen = new Set<string>();
  const out: QuestionOption[] = [];
  for (const o of options) {
    const rawValue = String(o.value ?? '').trim();
    // The reserved sentinel is rejected BEFORE slugging (slugValue would strip
    // its leading underscores into a legitimate-looking "other").
    if (rawValue === OTHER_VALUE) continue;
    const value = slugValue(rawValue);
    const label = String(o.label ?? '').trim().slice(0, 200);
    if (!value || !label || value === OTHER_VALUE || seen.has(value)) continue;
    seen.add(value);
    out.push({ value, label });
    if (out.length >= MAX_OPTIONS) break;
  }
  return out;
}

/** Coherence repair for one question; `id` is code-assigned by the caller. */
function repairQuestion(id: string, section_key: string, input: TailoredQuestionInput): EngagementQuestion {
  // Flags are judged against the DECLARED type (a `long` on a single is
  // off-type and forced false), then the type itself is repaired.
  const declared = input.qtype;
  const long = declared === 'text' ? Boolean(input.long) : false;
  let qtype = declared;
  let options = qtype === 'text' ? [] : repairOptions(input.options ?? []);
  if (qtype !== 'text' && options.length < 2) {
    qtype = 'text';
    options = [];
  }
  const allow_other = qtype === 'text' ? false : Boolean(input.allow_other);
  let max_select: number | null = null;
  if (qtype === 'multi') {
    const raw = Number.isInteger(input.max_select) ? input.max_select : 0;
    if (raw > 0) max_select = Math.max(1, Math.min(raw, options.length + (allow_other ? 1 : 0)));
  }
  const help = String(input.help ?? '').trim();
  return {
    id,
    section_key,
    qtype,
    prompt: String(input.prompt ?? '').trim().slice(0, 500),
    help: help === '' ? null : help.slice(0, 500),
    required: Boolean(input.required),
    options,
    allow_other,
    max_select,
    long,
  };
}

function newQuestionId(section_key: string, taken: Set<string>): string {
  const base = slugValue(section_key) || 'q';
  for (let n = 1; n < 1000; n += 1) {
    const candidate = `${base}_new_${n}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
  throw new Error('merge: could not allocate a question id');
}

export function mergeTailoredQuestionnaire(
  base: { sections: QuestionnaireSection[]; questions: EngagementQuestion[] },
  output: TailorOutput,
): MergeResult {
  const sectionKeys = new Set(base.sections.map((s) => s.key));
  const templateIds = new Set(base.questions.map((q) => q.id));

  // Explicit drops: only ids that exist count; > MAX_DROP_RATIO rejects.
  const dropped = [...new Set((output.dropped_template_question_ids ?? []).filter((id) => templateIds.has(id)))];
  if (base.questions.length > 0 && dropped.length / base.questions.length > MAX_DROP_RATIO) {
    return {
      ok: false,
      error: 'too_many_dropped',
      detail: `model dropped ${dropped.length} of ${base.questions.length} template questions (limit ${Math.floor(MAX_DROP_RATIO * 100)}%)`,
    };
  }
  const droppedSet = new Set(dropped);

  // Model questions, in model order, grouped by section. Unknown sections and
  // references to dropped/unknown template ids are malformed → ignored.
  const taken = new Set<string>(templateIds);
  const bySection = new Map<string, EngagementQuestion[]>();
  const mentioned = new Set<string>();
  let added: string[] = [];
  for (const input of output.questions ?? []) {
    if (!sectionKeys.has(input.section_key)) continue;
    const ref = String(input.template_question_id ?? '').trim();
    let id: string;
    if (ref !== '') {
      if (!templateIds.has(ref) || droppedSet.has(ref) || mentioned.has(ref)) continue; // unknown / dropped / duplicate reference
      mentioned.add(ref);
      id = ref;
    } else {
      id = newQuestionId(input.section_key, taken);
      added.push(id);
    }
    const list = bySection.get(input.section_key) ?? [];
    list.push(repairQuestion(id, input.section_key, input));
    bySection.set(input.section_key, list);
  }

  // Unmentioned, undropped template questions are kept, after the model's, in template order.
  const kept_unmentioned: string[] = [];
  for (const q of base.questions) {
    if (mentioned.has(q.id) || droppedSet.has(q.id)) continue;
    kept_unmentioned.push(q.id);
    const list = bySection.get(q.section_key) ?? [];
    list.push(q);
    bySection.set(q.section_key, list);
  }

  const questions: EngagementQuestion[] = [];
  for (const s of base.sections) questions.push(...(bySection.get(s.key) ?? []));
  if (questions.length > MAX_QUESTIONS) {
    // Over the cap: shed the model's ADDITIONS (newest first) before any
    // template question could be lost — "an omitted template question is
    // kept, never silently lost" holds even when the model over-adds.
    const addedSet = new Set(added);
    for (let i = questions.length - 1; i >= 0 && questions.length > MAX_QUESTIONS; i -= 1) {
      if (addedSet.has(questions[i].id)) {
        addedSet.delete(questions[i].id);
        questions.splice(i, 1);
      }
    }
    if (questions.length > MAX_QUESTIONS) {
      return { ok: false, error: 'malformed_output', detail: `${questions.length} questions exceed the cap of ${MAX_QUESTIONS}` };
    }
    added = added.filter((id) => addedSet.has(id));
  }

  // Section blurbs may be rewritten; keys/titles never change.
  const blurbs = new Map((output.section_blurbs ?? []).map((b) => [b.key, String(b.blurb ?? '').trim()]));
  const sections: QuestionnaireSection[] = base.sections.map((s) => {
    const blurb = blurbs.get(s.key);
    return blurb ? { ...s, blurb: blurb.slice(0, 500) } : s;
  });

  const parsed = questionnaireManifestSchema.safeParse({ sections, questions });
  if (!parsed.success) {
    return {
      ok: false,
      error: 'malformed_output',
      detail: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    };
  }

  return {
    ok: true,
    sections: parsed.data.sections,
    questions: parsed.data.questions,
    dropped,
    kept_unmentioned,
    added,
    status: 'draft',
  };
}
