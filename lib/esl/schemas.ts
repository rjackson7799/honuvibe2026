import { z } from 'zod';

// ============================================================
// Zod schemas for validating Claude API ESL output
// ============================================================

export const usageSentenceSchema = z.object({
  sentence_en: z.string().min(1),
  sentence_jp: z.string().min(1),
  highlight_indices: z.tuple([z.number(), z.number()]),
});

export const vocabularyItemSchema = z.object({
  id: z.string(),
  term_en: z.string().min(1),
  reading_en: z.string().min(1),
  definition_en: z.string().min(1),
  definition_jp: z.string().min(1),
  term_jp: z.string().min(1),
  part_of_speech: z.enum(['noun', 'verb', 'adjective', 'adverb', 'phrase']),
  difficulty: z.enum(['essential', 'intermediate', 'advanced']),
  usage_sentences: z.array(usageSentenceSchema).min(1).max(5),
  notes_jp: z.string().optional(),
  audio_keys: z.object({
    word: z.string(),
    sentences: z.array(z.string()),
  }),
});

export const grammarExampleSchema = z.object({
  sentence_en: z.string().min(1),
  sentence_jp: z.string().min(1),
  annotation_jp: z.string().optional(),
});

export const grammarPointSchema = z.object({
  id: z.string(),
  title_en: z.string().min(1),
  title_jp: z.string().min(1),
  explanation_en: z.string().min(1),
  explanation_jp: z.string().min(1),
  pattern: z.string().min(1),
  examples: z.array(grammarExampleSchema).min(1).max(5),
  common_mistakes_jp: z.string().optional(),
  audio_keys: z.object({
    examples: z.array(z.string()),
  }),
});

export const culturalNoteSchema = z.object({
  id: z.string(),
  title_en: z.string().min(1),
  title_jp: z.string().min(1),
  content_en: z.string().min(1),
  content_jp: z.string().min(1),
  category: z.enum(['professional', 'cultural', 'linguistic']),
  tip_jp: z.string().optional(),
});

export const comprehensionItemSchema = z.object({
  id: z.string(),
  type: z.enum(['vocabulary_match', 'fill_in_blank', 'sentence_order', 'translation']),
  question_en: z.string().min(1),
  question_jp: z.string().min(1),
  options: z.array(z.string()).optional(),
  correct_answer: z.union([z.string(), z.number()]),
  explanation_jp: z.string().min(1),
});

export const generatedESLContentSchema = z.object({
  vocabulary: z.array(vocabularyItemSchema).min(1),
  grammar: z.array(grammarPointSchema).min(1),
  cultural_notes: z.array(culturalNoteSchema).min(1),
  comprehension: z.array(comprehensionItemSchema).min(1),
});
