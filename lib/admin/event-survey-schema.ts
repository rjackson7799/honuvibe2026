/**
 * Validation schemas + input types for the event-survey admin builder.
 * Plain module (not the 'use server' actions file) so the derived types can be
 * imported by client components without bundling server code.
 */
import { z } from 'zod';

export const optionSchema = z.object({
  value: z.string().min(1).max(100),
  labelEn: z.string().min(1).max(300),
  labelJp: z.string().min(1).max(300),
});

export const questionInputSchema = z
  .object({
    qtype: z.enum(['single', 'multi', 'text']),
    promptEn: z.string().min(1).max(500),
    promptJp: z.string().min(1).max(500),
    helpEn: z.string().max(1000).nullish(),
    helpJp: z.string().max(1000).nullish(),
    required: z.boolean(),
    maxSelect: z.number().int().positive().nullish(),
    options: z.array(optionSchema).max(30),
  })
  .superRefine((q, ctx) => {
    if (q.qtype === 'text') {
      if (q.options.length > 0) {
        ctx.addIssue({ code: 'custom', message: 'Text questions cannot have options.' });
      }
      return;
    }
    if (q.options.length < 2) {
      ctx.addIssue({ code: 'custom', message: 'Choice questions need at least 2 options.' });
    }
    const values = new Set(q.options.map((o) => o.value));
    if (values.size !== q.options.length) {
      ctx.addIssue({ code: 'custom', message: 'Option values must be unique.' });
    }
    if (q.qtype === 'multi' && q.maxSelect != null && q.maxSelect > q.options.length) {
      ctx.addIssue({ code: 'custom', message: 'Max selectable cannot exceed the option count.' });
    }
  });

export type QuestionInput = z.input<typeof questionInputSchema>;
export type QuestionParsed = z.output<typeof questionInputSchema>;

/** Empty string / whitespace → null; otherwise an ISO datetime string. */
const nullableDateTime = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim() ? v : null));

export const eventSurveyInputSchema = z
  .object({
    eventSlug: z.string().min(1).max(100),
    titleEn: z.string().min(1).max(200),
    titleJp: z.string().min(1).max(200),
    introEn: z.string().max(2000).nullish(),
    introJp: z.string().max(2000).nullish(),
    isActive: z.boolean(),
    presenterEmail: z
      .union([z.string().email(), z.literal('')])
      .nullish()
      .transform((v) => v || null),
    presenterLocale: z.enum(['en', 'ja']).default('en'),
    opensAt: nullableDateTime,
    closesAt: nullableDateTime,
  })
  .superRefine((d, ctx) => {
    if (d.opensAt && d.closesAt && new Date(d.closesAt) <= new Date(d.opensAt)) {
      ctx.addIssue({ code: 'custom', message: 'Closes-at must be after opens-at.', path: ['closesAt'] });
    }
  });

export type EventSurveyInput = z.input<typeof eventSurveyInputSchema>;
