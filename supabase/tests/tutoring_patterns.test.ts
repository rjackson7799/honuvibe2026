import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { serviceClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';
import { applyPatternsForReport, loadPriorPatternLines } from '@/lib/tutoring/patterns';

// Deterministic pattern-loop integration test (no LLM): dedupe-by-category,
// increment-once-per-session, examples keep last 3, apply-once guard, and the
// read that feeds the next generation.

const USERS = FIXTURES.users;
const COURSE_ID = 'ffffffff-ffff-ffff-ffff-fffffffffa01';
const STUDENT = USERS.honuvibe_free;
const REPORT_A = 'ffffffff-ffff-ffff-ffff-fffffffffa10';
const REPORT_B = 'ffffffff-ffff-ffff-ffff-fffffffffa11';

const admin = serviceClient();

function ts(category: string, quote: string, correction: string) {
  return {
    pattern_category: category as never,
    pattern_label_en: category,
    pattern_label_jp: category,
    quote,
    correction,
  };
}

async function seedReport(id: string, date: string): Promise<void> {
  const { error } = await admin.from('session_reports').insert({
    id,
    course_id: COURSE_ID,
    student_id: STUDENT,
    session_date: date,
    status: 'published',
    created_by: USERS.honuvibe_admin,
  });
  if (error) throw error;
}

beforeAll(async () => {
  await seedFixtures();
  const { error } = await admin.from('courses').upsert(
    { id: COURSE_ID, slug: 'tutoring-patterns-test', title_en: 'Patterns Test', course_type: '1v1' },
    { onConflict: 'id' },
  );
  if (error) throw error;
});

beforeEach(async () => {
  await admin.from('student_patterns').delete().eq('course_id', COURSE_ID);
  await admin.from('session_reports').delete().eq('course_id', COURSE_ID);
  await seedReport(REPORT_A, '2026-06-01');
  await seedReport(REPORT_B, '2026-06-08');
});

describe('applyPatternsForReport', () => {
  test('dedupes categories to one increment per session; stamps guard', async () => {
    const res = await applyPatternsForReport(admin, {
      reportId: REPORT_A,
      courseId: COURSE_ID,
      studentId: STUDENT,
      sessionDate: '2026-06-01',
      troubleSpots: [
        ts('articles', 'I go to store', 'I go to the store'),
        ts('articles', 'a apple', 'an apple'), // same category — must NOT double count
        ts('verb_tense', 'I go yesterday', 'I went yesterday'),
      ],
    });
    expect(res.applied).toBe(true);

    const { data } = await admin
      .from('student_patterns')
      .select('category, occurrence_count, examples, last_seen_on')
      .eq('course_id', COURSE_ID)
      .eq('student_id', STUDENT);
    const byCat = Object.fromEntries((data ?? []).map((r) => [r.category, r]));
    expect(byCat.articles.occurrence_count).toBe(1);
    expect(byCat.verb_tense.occurrence_count).toBe(1);
    expect(byCat.articles.examples).toHaveLength(1);
    expect(byCat.articles.last_seen_on).toBe('2026-06-01');

    // Guard: re-applying the same report is a no-op.
    const again = await applyPatternsForReport(admin, {
      reportId: REPORT_A,
      courseId: COURSE_ID,
      studentId: STUDENT,
      sessionDate: '2026-06-01',
      troubleSpots: [ts('articles', 'x', 'y')],
    });
    expect(again.applied).toBe(false);
    const { data: after } = await admin
      .from('student_patterns')
      .select('occurrence_count')
      .eq('course_id', COURSE_ID)
      .eq('category', 'articles')
      .single();
    expect(after?.occurrence_count).toBe(1);
  });

  test('accumulates across sessions; examples keep the last 3', async () => {
    await applyPatternsForReport(admin, {
      reportId: REPORT_A,
      courseId: COURSE_ID,
      studentId: STUDENT,
      sessionDate: '2026-06-01',
      troubleSpots: [ts('articles', 'q1', 'c1')],
    });
    await applyPatternsForReport(admin, {
      reportId: REPORT_B,
      courseId: COURSE_ID,
      studentId: STUDENT,
      sessionDate: '2026-06-08',
      troubleSpots: [ts('articles', 'q2', 'c2'), ts('prepositions', 'q3', 'c3')],
    });

    const { data } = await admin
      .from('student_patterns')
      .select('category, occurrence_count, examples, last_seen_on')
      .eq('course_id', COURSE_ID);
    const byCat = Object.fromEntries((data ?? []).map((r) => [r.category, r]));
    expect(byCat.articles.occurrence_count).toBe(2);
    expect(byCat.articles.last_seen_on).toBe('2026-06-08');
    expect(byCat.prepositions.occurrence_count).toBe(1);
    // Newest example first, capped at 3.
    const examples = byCat.articles.examples as { quote: string }[];
    expect(examples.length).toBeLessThanOrEqual(3);
    expect(examples[0].quote).toBe('q2');
  });

  test('loadPriorPatternLines ranks by frequency for the next generation', async () => {
    await applyPatternsForReport(admin, {
      reportId: REPORT_A,
      courseId: COURSE_ID,
      studentId: STUDENT,
      sessionDate: '2026-06-01',
      troubleSpots: [ts('articles', 'q1', 'c1')],
    });
    await applyPatternsForReport(admin, {
      reportId: REPORT_B,
      courseId: COURSE_ID,
      studentId: STUDENT,
      sessionDate: '2026-06-08',
      troubleSpots: [ts('articles', 'q2', 'c2'), ts('prepositions', 'q3', 'c3')],
    });

    const lines = await loadPriorPatternLines(admin, COURSE_ID, STUDENT, 10);
    expect(lines[0].category).toBe('articles');
    expect(lines[0].occurrence_count).toBe(2);
    expect(lines[0].example?.quote).toBe('q2');
    expect(lines.some((l) => l.category === 'prepositions')).toBe(true);
  });
});
