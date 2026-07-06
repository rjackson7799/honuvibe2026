import type { GeneratedSessionReport, StudentReport } from './types';

/**
 * Deterministically split one Claude generation into the two persisted
 * variants. Re-derived on every admin save so the two can never drift.
 *
 *   instructor_json → the full report (session_report_private, admin-only RLS)
 *   student_json    → the full report MINUS instructor-only content:
 *                       - top-level `instructor_analysis`
 *                       - each `homework[].answer_key_en`
 *
 * The return type guarantees at compile time that student_json cannot carry
 * either instructor-only key (see StudentReport in ./types.ts).
 */
export function splitReport(full: GeneratedSessionReport): {
  instructor_json: GeneratedSessionReport;
  student_json: StudentReport;
} {
  // Destructure the instructor-only top-level field away, keep the rest.
  const { instructor_analysis: _instructorAnalysis, homework, ...studentSafe } = full;

  const student_json: StudentReport = {
    ...studentSafe,
    homework: homework.map(({ answer_key_en: _answerKey, ...task }) => task),
  };

  return { instructor_json: full, student_json };
}
