import { describe, expect, it } from 'vitest';
import { pathFeedbackSchema, pathIntakeSchema } from '@/lib/paths/validation';

const valid = { goal_description: 'Learn AI', difficulty_preference: 'beginner', language_preference: 'en' };
describe('study-path input bounds', () => {
  it('accepts existing intake with optional focus topics', () => {
    expect(pathIntakeSchema.parse(valid).focus_areas).toEqual([]);
  });
  it.each([
    { goal_description: 123 }, { goal_description: ' ' }, { goal_description: 'a'.repeat(501) },
    { focus_areas: 'not an array' }, { focus_areas: [123] }, { focus_areas: ['a'.repeat(101)] },
    { focus_areas: Array(11).fill('AI') }, { language_preference: 'unknown' },
  ])('rejects invalid preferences %j', (patch) => {
    expect(pathIntakeSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
  it('bounds feedback and rejects incorrect types', () => {
    expect(pathFeedbackSchema.safeParse({ feedback: 'a'.repeat(500) }).success).toBe(true);
    expect(pathFeedbackSchema.safeParse({ feedback: 'a'.repeat(501) }).success).toBe(false);
    expect(pathFeedbackSchema.safeParse({ feedback: [] }).success).toBe(false);
  });
});
