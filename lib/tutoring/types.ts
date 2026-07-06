// ============================================================
// 1v1 tutoring session-companion types
// (DB rows for migration 052 + generation context; report content types are
//  derived from the Zod schemas in ./schemas.ts to keep them in lockstep.)
// ============================================================
import type { GeneratedSessionReport, PatternCategory } from './schemas';

export type { GeneratedSessionReport, PatternCategory } from './schemas';

export type SessionReportStatus = 'generating' | 'review' | 'published' | 'failed';

// The student-facing variant: the full report minus instructor-only content.
// Typed via Omit so it is structurally impossible for student_json to carry
// instructor_analysis or a homework answer key. splitReport() produces this.
export type StudentReport = Omit<GeneratedSessionReport, 'instructor_analysis' | 'homework'> & {
  homework: Array<Omit<GeneratedSessionReport['homework'][number], 'answer_key_en'>>;
};

// ------------------------------------------------------------
// DB rows
// ------------------------------------------------------------
export interface SessionReport {
  id: string;
  course_id: string;
  student_id: string;
  session_date: string; // 'YYYY-MM-DD'
  topic: string | null;
  duration_minutes: number | null;
  status: SessionReportStatus;
  student_json: StudentReport | null;
  published_at: string | null;
  patterns_applied_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionReportPrivate {
  report_id: string;
  transcript_ref: string | null;
  margin_notes: string | null;
  instructor_json: GeneratedSessionReport | null;
  generation_error: string | null;
  model_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  updated_at: string;
}

export interface PatternExample {
  quote: string;
  correction: string;
  session_date: string; // 'YYYY-MM-DD'
}

export interface StudentPattern {
  id: string;
  course_id: string;
  student_id: string;
  category: PatternCategory;
  label_en: string | null;
  label_jp: string | null;
  occurrence_count: number;
  last_seen_on: string | null;
  examples: PatternExample[];
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------
// Composite / admin view types
// ------------------------------------------------------------
export interface SessionReportWithPrivate extends SessionReport {
  private: SessionReportPrivate | null;
}

// Row shape for the admin course list (one 1v1 course = one engagement).
export interface TutoringCourseSummary {
  courseId: string;
  slug: string;
  titleEn: string;
  studentId: string | null;
  studentName: string | null;
  studentEmail: string | null;
  reportCount: number;
  lastSessionDate: string | null;
}

// ------------------------------------------------------------
// Generation pipeline context
// ------------------------------------------------------------
export interface PriorPatternLine {
  category: PatternCategory;
  label_en: string | null;
  label_jp: string | null;
  occurrence_count: number;
  last_seen_on: string | null;
  example: PatternExample | null;
}

export interface SessionReportContext {
  courseTitleEn: string;
  studentName: string | null;
  sessionDate: string;
  topic: string | null;
  durationMinutes: number | null;
  transcript: string;
  priorPatterns: PriorPatternLine[];
}
