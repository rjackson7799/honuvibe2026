// Input budget for the two AI calls (tailoring + brief). Per-answer caps alone
// do not bound cost or latency — 40 long answers permit ~200k client
// characters — so both prompts are assembled by ONE buildBudgetedContext()
// with deterministic truncation applied in this order until the total fits:
//   1. audit summary capped at AUDIT_SUMMARY_MAX_CHARS;
//   2. each answer capped at ANSWER_MAX_CHARS with a VISIBLE marker;
//   3. if the client-answer block still exceeds ANSWERS_BLOCK_MAX_CHARS,
//      answers are truncated PROPORTIONALLY BY SECTION — never dropped whole.
// Whatever was cut is recorded in `truncated` (persisted as
// source_snapshot.truncated on the brief) and the system prompt tells the
// model to say so in confidence_note. The DIGEST is built from the untruncated
// snapshot (digest.ts) — only the model input is budgeted.
//
// Every string here is client-typed or website-derived and therefore
// untrusted: neutralize() strips angle brackets so a forged closing tag can
// never break out of the named delimiter blocks the generator wraps around it.

import { OTHER_VALUE, type AnswerSnapshot } from './questions-schema';
import { renderSnapshot, type RenderedAnswer } from './validate-answers';

export const AUDIT_SUMMARY_MAX_CHARS = 8_000;
export const ANSWER_MAX_CHARS = 2_000;
export const ANSWERS_BLOCK_MAX_CHARS = 48_000;
export const TRUNCATION_MARKER = '[… truncated]';
/** A proportionally-shortened answer always keeps at least this much (or all of it, if shorter). */
const MIN_KEEP_CHARS = 40;

/** Strip characters that could forge a delimiter or inject markup. */
export function neutralize(value: string): string {
  return value.replace(/[<>]/g, ' ').trim();
}

export interface TruncationRecord {
  audit_summary: { from: number; to: number } | null;
  answers_capped: { question_id: string; from: number; to: number }[];
  answers_proportional: { section_key: string; from: number; to: number }[];
}

export interface BudgetedContext {
  audit_summary: string | null;
  answers_block: string;
  question_count: number;
  answered_count: number;
  /** null when nothing was cut. */
  truncated: TruncationRecord | null;
}

/** "answer text" for the prompt: the trimmed text, or the chosen labels ("Other: …" marked). */
export function answerToText(item: RenderedAnswer): string {
  if (!item.answered) return '—';
  if (item.qtype === 'text') return item.text ?? '';
  const parts = item.selected.map((s) =>
    s.value === OTHER_VALUE ? `Other: ${item.other_text ?? ''}`.trim() : s.label,
  );
  return parts.join('; ');
}

function cutTo(text: string, max: number): string {
  const room = Math.max(0, max - TRUNCATION_MARKER.length - 1);
  return `${text.slice(0, room).trimEnd()} ${TRUNCATION_MARKER}`;
}

interface Entry {
  section_key: string;
  section_title: string;
  question_id: string;
  prompt: string;
  required: boolean;
  answer: string;
}

function assemble(entries: Entry[]): string {
  const lines: string[] = [];
  let currentSection: string | null = null;
  for (const e of entries) {
    if (e.section_key !== currentSection) {
      if (currentSection !== null) lines.push('');
      lines.push(`## [${e.section_key}] ${e.section_title}`);
      currentSection = e.section_key;
    }
    lines.push(`- (${e.question_id}${e.required ? ', required' : ''}) ${e.prompt}`);
    lines.push(`  → ${e.answer}`);
  }
  return lines.join('\n');
}

export function buildBudgetedContext(input: {
  auditSummary: string | null;
  snapshot: AnswerSnapshot;
}): BudgetedContext {
  const record: TruncationRecord = { audit_summary: null, answers_capped: [], answers_proportional: [] };

  // 1. Audit summary.
  let auditSummary: string | null = input.auditSummary ? neutralize(input.auditSummary) : null;
  if (auditSummary !== null && auditSummary.length > AUDIT_SUMMARY_MAX_CHARS) {
    record.audit_summary = { from: auditSummary.length, to: AUDIT_SUMMARY_MAX_CHARS };
    auditSummary = cutTo(auditSummary, AUDIT_SUMMARY_MAX_CHARS);
  }
  if (auditSummary === '') auditSummary = null;

  // 2. Per-answer cap.
  const rendered = renderSnapshot(input.snapshot);
  const entries: Entry[] = [];
  let answeredCount = 0;
  for (const section of rendered.sections) {
    for (const item of section.items) {
      if (item.answered) answeredCount += 1;
      let answer = neutralize(answerToText(item));
      if (answer === '') answer = '—';
      if (answer.length > ANSWER_MAX_CHARS) {
        record.answers_capped.push({ question_id: item.question_id, from: answer.length, to: ANSWER_MAX_CHARS });
        answer = cutTo(answer, ANSWER_MAX_CHARS);
      }
      entries.push({
        section_key: section.key,
        section_title: neutralize(section.title) || section.key,
        question_id: item.question_id,
        prompt: neutralize(item.prompt),
        required: item.required,
        answer,
      });
    }
  }

  // 3. Proportional-by-section truncation over the block budget.
  let block = assemble(entries);
  if (block.length > ANSWERS_BLOCK_MAX_CHARS) {
    const originalBySection = new Map<string, number>();
    for (const e of entries) {
      originalBySection.set(e.section_key, (originalBySection.get(e.section_key) ?? 0) + e.answer.length);
    }
    const answerTotal = entries.reduce((n, e) => n + e.answer.length, 0);
    const overhead = block.length - answerTotal;
    let factor = Math.max(0, ANSWERS_BLOCK_MAX_CHARS - overhead) / Math.max(1, answerTotal);
    const original = entries.map((e) => e.answer);

    for (let attempt = 0; attempt < 8 && block.length > ANSWERS_BLOCK_MAX_CHARS; attempt += 1) {
      for (let i = 0; i < entries.length; i += 1) {
        const full = original[i];
        const keep = Math.max(Math.min(full.length, MIN_KEEP_CHARS), Math.floor(full.length * factor));
        entries[i].answer = keep >= full.length ? full : cutTo(full, keep + TRUNCATION_MARKER.length + 1);
      }
      block = assemble(entries);
      factor *= 0.9; // the marker adds overhead; tighten and retry
    }

    const afterBySection = new Map<string, number>();
    for (const e of entries) {
      afterBySection.set(e.section_key, (afterBySection.get(e.section_key) ?? 0) + e.answer.length);
    }
    for (const [key, from] of originalBySection) {
      const to = afterBySection.get(key) ?? 0;
      if (to < from) record.answers_proportional.push({ section_key: key, from, to });
    }
  }

  const anyCut =
    record.audit_summary !== null || record.answers_capped.length > 0 || record.answers_proportional.length > 0;

  return {
    audit_summary: auditSummary,
    answers_block: block,
    question_count: input.snapshot.questions.length,
    answered_count: answeredCount,
    truncated: anyCut ? record : null,
  };
}
