// The questionnaire manifest contract (migration 067 stores it as jsonb on
// engagement_questionnaires.sections / .questions). Zod OWNS the interior —
// SQL guards shape and count only — so every write site (template resolution,
// AI tailoring merge, the editor, the RPC finalizer) parses through here.
//
// Decision #5: question types are single | multi | text only, plus allow_other
// on choice types and long on text. `__other` is a RESERVED sentinel option
// value injected by the renderer/validator when allow_other is true; it is
// NEVER stored in `options`, so the AI cannot emit two "other"s and the label
// is localized exactly once (OTHER_LABEL).

import { z } from 'zod';

export const OTHER_VALUE = '__other';
export const OTHER_LABEL: Record<'en' | 'ja', string> = { en: 'Other', ja: 'その他' };

export const MAX_SECTIONS = 12;
export const MAX_QUESTIONS = 40;
export const MAX_OPTIONS = 12;
export const TEXT_MAX_SHORT = 500;
export const TEXT_MAX_LONG = 5000;
export const OTHER_TEXT_MAX = 500;

export const QUESTION_TYPES = ['single', 'multi', 'text'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

const keySchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, 'lowercase letters, digits, _ and - only');

export const questionOptionSchema = z.strictObject({
  value: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .refine((v) => v !== OTHER_VALUE, `"${OTHER_VALUE}" is reserved for allow_other`),
  label: z.string().trim().min(1).max(200),
});

export const questionnaireSectionSchema = z.strictObject({
  key: keySchema,
  title: z.string().trim().min(1).max(120),
  blurb: z.string().trim().max(500).nullable(),
});

export const engagementQuestionSchema = z
  .strictObject({
    id: keySchema,
    section_key: keySchema,
    qtype: z.enum(QUESTION_TYPES),
    prompt: z.string().trim().min(1).max(500),
    help: z.string().trim().max(500).nullable(),
    required: z.boolean(),
    options: z.array(questionOptionSchema).max(MAX_OPTIONS),
    allow_other: z.boolean(),
    // Counts the "other" choice too, so it may exceed options.length by one.
    max_select: z.number().int().min(1).max(MAX_OPTIONS + 1).nullable(),
    long: z.boolean(),
  })
  .superRefine((q, ctx) => {
    if (q.qtype === 'text') {
      if (q.options.length > 0)
        ctx.addIssue({ code: 'custom', path: ['options'], message: 'text questions have no options' });
      if (q.allow_other)
        ctx.addIssue({ code: 'custom', path: ['allow_other'], message: 'allow_other is for choice questions' });
      if (q.max_select !== null)
        ctx.addIssue({ code: 'custom', path: ['max_select'], message: 'max_select is for multi questions' });
      return;
    }
    if (q.long) ctx.addIssue({ code: 'custom', path: ['long'], message: 'long is for text questions' });
    if (q.options.length < 2)
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'choice questions need at least 2 options' });
    const values = new Set(q.options.map((o) => o.value));
    if (values.size !== q.options.length)
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'option values must be unique' });
    if (q.qtype === 'single' && q.max_select !== null)
      ctx.addIssue({ code: 'custom', path: ['max_select'], message: 'max_select is for multi questions' });
    if (q.qtype === 'multi' && q.max_select !== null) {
      const ceiling = q.options.length + (q.allow_other ? 1 : 0);
      if (q.max_select > ceiling)
        ctx.addIssue({ code: 'custom', path: ['max_select'], message: `max_select cannot exceed ${ceiling}` });
    }
  });

export const questionnaireManifestSchema = z
  .strictObject({
    sections: z.array(questionnaireSectionSchema).min(1).max(MAX_SECTIONS),
    questions: z.array(engagementQuestionSchema).min(1).max(MAX_QUESTIONS),
  })
  .superRefine((m, ctx) => {
    const sectionKeys = new Set<string>();
    m.sections.forEach((s, i) => {
      if (sectionKeys.has(s.key))
        ctx.addIssue({ code: 'custom', path: ['sections', i, 'key'], message: `duplicate section key "${s.key}"` });
      sectionKeys.add(s.key);
    });
    const ids = new Set<string>();
    m.questions.forEach((q, i) => {
      if (ids.has(q.id))
        ctx.addIssue({ code: 'custom', path: ['questions', i, 'id'], message: `duplicate question id "${q.id}"` });
      ids.add(q.id);
      if (!sectionKeys.has(q.section_key))
        ctx.addIssue({
          code: 'custom',
          path: ['questions', i, 'section_key'],
          message: `unknown section "${q.section_key}"`,
        });
    });
  });

export type QuestionOption = z.infer<typeof questionOptionSchema>;
export type QuestionnaireSection = z.infer<typeof questionnaireSectionSchema>;
export type EngagementQuestion = z.infer<typeof engagementQuestionSchema>;
export type QuestionnaireManifest = z.infer<typeof questionnaireManifestSchema>;

/** A stored answer value: a string (text / single) or an array of strings (multi). */
export const answerValueSchema = z.union([z.string(), z.array(z.string())]);
export type AnswerValue = z.infer<typeof answerValueSchema>;

export const storedAnswerSchema = z.object({
  question_id: z.string(),
  answer: answerValueSchema,
  other_text: z.string().nullable(),
});
export type StoredAnswer = z.infer<typeof storedAnswerSchema>;

// What submit_engagement_questionnaire pins into answer_snapshot: the manifest
// at the version it was answered against, plus the raw answers. Rendering
// resolves labels from THIS, never from a live lookup.
export const answerSnapshotSchema = z.object({
  questions_version: z.number().int().min(1),
  locale: z.enum(['en', 'ja']),
  title: z.string(),
  sections: z.array(questionnaireSectionSchema),
  questions: z.array(engagementQuestionSchema),
  answers: z.array(storedAnswerSchema),
});
export type AnswerSnapshot = z.infer<typeof answerSnapshotSchema>;

/** The character cap for a text answer — `long` switches between 500 and 5000. */
export function textCapFor(question: Pick<EngagementQuestion, 'qtype' | 'long'>): number {
  return question.qtype === 'text' && question.long ? TEXT_MAX_LONG : TEXT_MAX_SHORT;
}
