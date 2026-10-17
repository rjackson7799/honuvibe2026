import { z } from 'zod';

export const pathIntakeSchema = z.object({
  goal_description: z.string().trim().min(1).max(500),
  difficulty_preference: z.enum(['beginner', 'intermediate', 'advanced']),
  language_preference: z.enum(['en', 'ja']),
  focus_areas: z.array(z.string().trim().min(1).max(100)).max(10).default([]),
});

export const pathFeedbackSchema = z.object({
  feedback: z.string().trim().max(500).optional(),
});
