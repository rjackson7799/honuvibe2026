import type { CourseSession, SessionTopic, CourseResource } from '@/lib/courses/types';

export interface TeachingMaterialInput {
  // Course context
  courseName: string;
  courseCode: string | null;
  courseLevel: string | null;

  // Session data
  sessionNumber: number;
  sessionTitle: string;
  sessionFormat: string;
  sessionDuration: number | null;
  scheduledAt: string | null;
  description: string | null;
  topics: SessionTopic[];
  materials: string[];
  slideDeckUrl: string | null;

  // Instructor
  instructorName: string;

  // Next session preview (for wrap-up slide)
  nextSessionTitle: string | null;

  // Resources linked to this session
  resources: CourseResource[];

  // Locale
  locale: string;
}
