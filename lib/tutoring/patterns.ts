import type { SupabaseClient } from '@supabase/supabase-js';
import type { PriorPatternLine, PatternCategory, PatternExample } from './types';

// The subset of a trouble spot the pattern loop needs. Trouble spots are
// student-safe, so this is identical in student_json and instructor_json.
export interface TroubleSpotForPattern {
  pattern_category: PatternCategory;
  pattern_label_en: string;
  pattern_label_jp: string;
  quote: string;
  correction: string;
}

/**
 * READ half of the pattern loop. Load the student's top recurring patterns to
 * seed a new generation. Ranked by frequency then recency; capped to `limit`.
 * Uses a service-role client (student_patterns is admin-only RLS).
 */
export async function loadPriorPatternLines(
  admin: SupabaseClient,
  courseId: string,
  studentId: string,
  limit = 10,
): Promise<PriorPatternLine[]> {
  const { data } = await admin
    .from('student_patterns')
    .select('category, label_en, label_jp, occurrence_count, last_seen_on, examples')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .order('occurrence_count', { ascending: false })
    .order('last_seen_on', { ascending: false, nullsFirst: false })
    .limit(limit);

  return (data ?? []).map((r) => {
    const examples = (r.examples ?? []) as PatternExample[];
    return {
      category: r.category as PatternCategory,
      label_en: r.label_en,
      label_jp: r.label_jp,
      occurrence_count: r.occurrence_count,
      last_seen_on: r.last_seen_on,
      example: examples.length > 0 ? examples[0] : null,
    };
  });
}

/**
 * WRITE half of the pattern loop, run once at publish. Deterministic — Claude
 * never writes student_patterns. Idempotent via the patterns_applied_at guard:
 * a report's trouble spots contribute exactly one increment per category
 * (five article mistakes in one session ≠ 5 counts). examples keeps the last 3
 * {quote, correction, session_date}. Post-publish edits never re-apply.
 */
export async function applyPatternsForReport(
  admin: SupabaseClient,
  params: {
    reportId: string;
    courseId: string;
    studentId: string;
    sessionDate: string;
    troubleSpots: TroubleSpotForPattern[];
  },
): Promise<{ applied: boolean }> {
  const { reportId, courseId, studentId, sessionDate, troubleSpots } = params;

  // Guard: apply at most once per report.
  const { data: report } = await admin
    .from('session_reports')
    .select('patterns_applied_at')
    .eq('id', reportId)
    .single();
  if (!report || report.patterns_applied_at) return { applied: false };

  // Dedupe this session's trouble spots to one entry per category.
  const byCategory = new Map<string, TroubleSpotForPattern>();
  for (const ts of troubleSpots) {
    if (!byCategory.has(ts.pattern_category)) byCategory.set(ts.pattern_category, ts);
  }

  const categories = [...byCategory.keys()];
  if (categories.length > 0) {
    const { data: existingRows } = await admin
      .from('student_patterns')
      .select('category, label_en, label_jp, occurrence_count, examples')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .in('category', categories);

    const existingByCat = new Map(
      (existingRows ?? []).map((r) => [r.category as string, r]),
    );

    const rows = [...byCategory.entries()].map(([category, ts]) => {
      const prev = existingByCat.get(category);
      const prevExamples = (prev?.examples ?? []) as PatternExample[];
      const newExample: PatternExample = {
        quote: ts.quote,
        correction: ts.correction,
        session_date: sessionDate,
      };
      return {
        course_id: courseId,
        student_id: studentId,
        category,
        label_en: ts.pattern_label_en || prev?.label_en || null,
        label_jp: ts.pattern_label_jp || prev?.label_jp || null,
        occurrence_count: (prev?.occurrence_count ?? 0) + 1,
        last_seen_on: sessionDate,
        examples: [newExample, ...prevExamples].slice(0, 3),
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await admin
      .from('student_patterns')
      .upsert(rows, { onConflict: 'course_id,student_id,category' });
    if (error) throw new Error(`Failed to apply patterns: ${error.message}`);
  }

  // Stamp so post-publish edits and re-publishes never double-count.
  await admin
    .from('session_reports')
    .update({ patterns_applied_at: new Date().toISOString() })
    .eq('id', reportId)
    .is('patterns_applied_at', null);

  return { applied: true };
}
