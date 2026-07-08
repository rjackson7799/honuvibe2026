/**
 * Validation schema + input type for the course-survey builder settings.
 * Question CRUD reuses the generic schema in event-survey-schema.ts.
 */
import { z } from 'zod';

const nullableDateTime = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim() ? v : null));

export const courseSurveyInputSchema = z
  .object({
    courseId: z.string().uuid(),
    titleEn: z.string().min(1).max(200),
    titleJp: z.string().min(1).max(200),
    introEn: z.string().max(2000).nullish(),
    introJp: z.string().max(2000).nullish(),
    isActive: z.boolean(),
    generateStudentProfile: z.boolean().default(false),
    opensAt: nullableDateTime,
    closesAt: nullableDateTime,
  })
  .superRefine((d, ctx) => {
    if (d.opensAt && d.closesAt && new Date(d.closesAt) <= new Date(d.opensAt)) {
      ctx.addIssue({ code: 'custom', message: 'Closes-at must be after opens-at.', path: ['closesAt'] });
    }
  });

export type CourseSurveyInput = z.input<typeof courseSurveyInputSchema>;
