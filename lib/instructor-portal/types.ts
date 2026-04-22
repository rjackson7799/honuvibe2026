import type { Course, CourseLevel } from '@/lib/courses/types';

export type CourseProposalInput = {
  title_en: string;
  description_en: string;
  level: CourseLevel;
  learning_outcomes_en: string[];
  who_is_for_en: string[];
  tools_covered: string[];
  price_usd: number;
  price_jpy: number;
};

export type InstructorScope = {
  userId: string;
  instructorProfileId: string;
  displayName: string;
};

export type InstructorCourseRow = Pick<
  Course,
  | 'id'
  | 'slug'
  | 'title_en'
  | 'description_en'
  | 'level'
  | 'status'
  | 'is_published'
  | 'price_usd'
  | 'price_jpy'
  | 'proposal_submitted_at'
  | 'proposal_review_notes'
  | 'created_at'
  | 'updated_at'
>;
