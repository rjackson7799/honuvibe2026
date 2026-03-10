import { z } from 'zod';

// Zod schemas for validating Claude API path generation output

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const claudePathItemSchema = z.object({
  content_item_id: z.string().regex(UUID_REGEX, 'Must be a valid UUID'),
  sort_order: z.number().int().positive(),
  rationale_en: z.string().min(1),
  rationale_jp: z.string().min(1),
  learning_focus_en: z.string().min(1),
  learning_focus_jp: z.string().min(1),
});

export const claudePathResponseSchema = z.object({
  title_en: z.string().min(1),
  title_jp: z.string().min(1),
  description_en: z.string().min(1),
  description_jp: z.string().min(1),
  estimated_hours: z.number().positive(),
  items: z.array(claudePathItemSchema).min(3).max(20),
  gaps: z.string().nullable(),
});
