import { z } from 'zod';

// ============================================================
// 1v1 session report — Zod schemas + Anthropic tool definition
// One Claude generation is validated here, then split (lib/tutoring/split.ts)
// into a student-safe payload and an instructor-only payload.
// ============================================================

// Trouble-spot / pattern taxonomy. Claude tags each trouble spot with one of
// these slugs so student_patterns can accumulate longitudinally by category.
export const PATTERN_CATEGORIES = [
  'articles',
  'prepositions',
  'verb_tense',
  'subject_verb_agreement',
  'plurals_countability',
  'word_order',
  'word_choice',
  'pronunciation',
  'listening_comprehension',
  'register_politeness',
  'question_formation',
  'connectors_transitions',
  'katakana_english',
  'other',
] as const;

export type PatternCategory = (typeof PATTERN_CATEGORIES)[number];

// Canonical bilingual labels — used to seed the prompt's category list and as a
// display fallback for student_patterns rows.
export const PATTERN_LABELS: Record<PatternCategory, { en: string; jp: string }> = {
  articles: { en: 'Articles', jp: '冠詞' },
  prepositions: { en: 'Prepositions', jp: '前置詞' },
  verb_tense: { en: 'Verb tense', jp: '時制' },
  subject_verb_agreement: { en: 'Subject–verb agreement', jp: '主語と動詞の一致' },
  plurals_countability: { en: 'Plurals & countability', jp: '複数形・可算/不可算' },
  word_order: { en: 'Word order', jp: '語順' },
  word_choice: { en: 'Word choice', jp: '語彙選択' },
  pronunciation: { en: 'Pronunciation', jp: '発音' },
  listening_comprehension: { en: 'Listening comprehension', jp: 'リスニング理解' },
  register_politeness: { en: 'Register & politeness', jp: '丁寧さ・レジスター' },
  question_formation: { en: 'Question formation', jp: '疑問文の作り方' },
  connectors_transitions: { en: 'Connectors & transitions', jp: '接続表現' },
  katakana_english: { en: 'Katakana English', jp: 'カタカナ英語' },
  other: { en: 'Other', jp: 'その他' },
};

export const winSchema = z.object({
  win_en: z.string().min(1),
  win_jp: z.string().min(1),
  quote: z.string().optional(),
});

export const troubleSpotSchema = z.object({
  id: z.string(),
  quote: z.string().min(1), // verbatim from transcript
  correction: z.string().min(1),
  explanation_en: z.string().min(1),
  explanation_jp: z.string().min(1),
  pattern_category: z.enum(PATTERN_CATEGORIES),
  pattern_label_en: z.string().min(1),
  pattern_label_jp: z.string().min(1),
});

export const recurringPatternSchema = z.object({
  category: z.enum(PATTERN_CATEGORIES),
  note_en: z.string().min(1),
  note_jp: z.string().min(1),
  trend: z.enum(['improving', 'persistent', 'new']),
});

export const studyAreaSchema = z.object({
  area_en: z.string().min(1),
  area_jp: z.string().min(1),
  why_en: z.string().min(1),
  why_jp: z.string().min(1),
});

export const reportVocabularySchema = z.object({
  id: z.string(),
  term_en: z.string().min(1),
  term_jp: z.string().min(1),
  reading_en: z.string().optional(), // IPA
  example_en: z.string().min(1),
  example_jp: z.string().min(1),
});

export const grammarExampleSchema = z.object({
  sentence_en: z.string().min(1),
  sentence_jp: z.string().min(1),
});

export const reportGrammarPointSchema = z.object({
  id: z.string(),
  title_en: z.string().min(1),
  title_jp: z.string().min(1),
  pattern: z.string().min(1),
  explanation_en: z.string().min(1),
  explanation_jp: z.string().min(1),
  examples: z.array(grammarExampleSchema).min(1).max(3),
});

export const homeworkSchema = z.object({
  id: z.string(),
  task_en: z.string().min(1),
  task_jp: z.string().min(1),
  // INSTRUCTOR-ONLY — stripped from student_json by splitReport(). Optional
  // because open-ended tasks (e.g. speaking practice) have no single key.
  answer_key_en: z.string().optional(),
});

export const generatedSessionReportSchema = z.object({
  snapshot: z.object({
    summary_en: z.string().min(1),
    summary_jp: z.string().min(1),
  }),
  wins: z.array(winSchema).min(1),
  trouble_spots: z.array(troubleSpotSchema).min(1),
  recurring_patterns: z.array(recurringPatternSchema),
  study_areas: z.array(studyAreaSchema),
  vocabulary: z.array(reportVocabularySchema),
  grammar_points: z.array(reportGrammarPointSchema),
  homework: z.array(homeworkSchema).min(1),
  next_session_focus: z.object({
    focus_en: z.string().min(1),
    focus_jp: z.string().min(1),
  }),
  // INSTRUCTOR-ONLY — candid analysis, stripped from student_json.
  instructor_analysis: z.string().min(1),
});

export type GeneratedSessionReport = z.infer<typeof generatedSessionReportSchema>;

// ------------------------------------------------------------
// Anthropic tool definition — forces structured JSON via tool_use.
// Hand-written to mirror generatedSessionReportSchema (cf. ESL_CONTENT_TOOL).
// ------------------------------------------------------------
export const SESSION_REPORT_TOOL = {
  name: 'submit_session_report',
  description:
    'Submit the structured 1v1 tutoring session diagnostic report for the student.',
  input_schema: {
    type: 'object' as const,
    properties: {
      snapshot: {
        type: 'object' as const,
        properties: {
          summary_en: { type: 'string' as const },
          summary_jp: { type: 'string' as const },
        },
        required: ['summary_en', 'summary_jp'],
      },
      wins: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            win_en: { type: 'string' as const },
            win_jp: { type: 'string' as const },
            quote: { type: 'string' as const },
          },
          required: ['win_en', 'win_jp'],
        },
      },
      trouble_spots: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            id: { type: 'string' as const },
            quote: { type: 'string' as const },
            correction: { type: 'string' as const },
            explanation_en: { type: 'string' as const },
            explanation_jp: { type: 'string' as const },
            pattern_category: { type: 'string' as const, enum: [...PATTERN_CATEGORIES] },
            pattern_label_en: { type: 'string' as const },
            pattern_label_jp: { type: 'string' as const },
          },
          required: [
            'id',
            'quote',
            'correction',
            'explanation_en',
            'explanation_jp',
            'pattern_category',
            'pattern_label_en',
            'pattern_label_jp',
          ],
        },
      },
      recurring_patterns: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            category: { type: 'string' as const, enum: [...PATTERN_CATEGORIES] },
            note_en: { type: 'string' as const },
            note_jp: { type: 'string' as const },
            trend: { type: 'string' as const, enum: ['improving', 'persistent', 'new'] },
          },
          required: ['category', 'note_en', 'note_jp', 'trend'],
        },
      },
      study_areas: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            area_en: { type: 'string' as const },
            area_jp: { type: 'string' as const },
            why_en: { type: 'string' as const },
            why_jp: { type: 'string' as const },
          },
          required: ['area_en', 'area_jp', 'why_en', 'why_jp'],
        },
      },
      vocabulary: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            id: { type: 'string' as const },
            term_en: { type: 'string' as const },
            term_jp: { type: 'string' as const },
            reading_en: { type: 'string' as const },
            example_en: { type: 'string' as const },
            example_jp: { type: 'string' as const },
          },
          required: ['id', 'term_en', 'term_jp', 'example_en', 'example_jp'],
        },
      },
      grammar_points: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            id: { type: 'string' as const },
            title_en: { type: 'string' as const },
            title_jp: { type: 'string' as const },
            pattern: { type: 'string' as const },
            explanation_en: { type: 'string' as const },
            explanation_jp: { type: 'string' as const },
            examples: {
              type: 'array' as const,
              items: {
                type: 'object' as const,
                properties: {
                  sentence_en: { type: 'string' as const },
                  sentence_jp: { type: 'string' as const },
                },
                required: ['sentence_en', 'sentence_jp'],
              },
            },
          },
          required: ['id', 'title_en', 'title_jp', 'pattern', 'explanation_en', 'explanation_jp', 'examples'],
        },
      },
      homework: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            id: { type: 'string' as const },
            task_en: { type: 'string' as const },
            task_jp: { type: 'string' as const },
            answer_key_en: { type: 'string' as const },
          },
          required: ['id', 'task_en', 'task_jp'],
        },
      },
      next_session_focus: {
        type: 'object' as const,
        properties: {
          focus_en: { type: 'string' as const },
          focus_jp: { type: 'string' as const },
        },
        required: ['focus_en', 'focus_jp'],
      },
      instructor_analysis: { type: 'string' as const },
    },
    required: [
      'snapshot',
      'wins',
      'trouble_spots',
      'recurring_patterns',
      'study_areas',
      'vocabulary',
      'grammar_points',
      'homework',
      'next_session_focus',
      'instructor_analysis',
    ],
  },
};
