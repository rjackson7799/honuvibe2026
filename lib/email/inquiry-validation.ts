import { z } from 'zod';

export const inquirySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(1).max(5000),
  company: z.string().trim().max(200).nullable().optional(),
  type: z.enum(['group', 'corporate', 'partnership', 'other']).catch('other'),
  source_locale: z.enum(['en', 'ja']).optional(),
});
