import { describe, expect, test } from 'vitest';
import { generatedSessionReportSchema, type GeneratedSessionReport } from './schemas';
import { splitReport } from './split';

function makeFullReport(): GeneratedSessionReport {
  return {
    snapshot: { summary_en: 'Great session.', summary_jp: '良いセッションでした。' },
    wins: [{ win_en: 'Clear intros', win_jp: '明確な自己紹介', quote: 'Hello, I am Shiori.' }],
    trouble_spots: [
      {
        id: 'trouble_0',
        quote: 'I went to store yesterday',
        correction: 'I went to the store yesterday.',
        explanation_en: 'Singular countable nouns need an article.',
        explanation_jp: '可算名詞の単数形には冠詞が必要です。',
        pattern_category: 'articles',
        pattern_label_en: 'Articles',
        pattern_label_jp: '冠詞',
      },
    ],
    recurring_patterns: [
      { category: 'articles', note_en: 'Still dropping "the".', note_jp: '「the」の脱落が続く。', trend: 'persistent' },
    ],
    study_areas: [
      { area_en: 'Articles', area_jp: '冠詞', why_en: 'Frequent in speech.', why_jp: '会話で頻出。' },
    ],
    vocabulary: [
      {
        id: 'vocab_0',
        term_en: 'inventory',
        term_jp: '在庫',
        reading_en: '/ˈɪnvəntɔːri/',
        example_en: 'We checked the inventory.',
        example_jp: '在庫を確認しました。',
      },
    ],
    grammar_points: [
      {
        id: 'grammar_0',
        title_en: 'Definite article',
        title_jp: '定冠詞',
        pattern: 'the + noun',
        explanation_en: 'Use "the" for a specific noun.',
        explanation_jp: '特定の名詞には「the」を使います。',
        examples: [{ sentence_en: 'the store', sentence_jp: 'その店' }],
      },
    ],
    homework: [
      {
        id: 'hw_0',
        task_en: 'Fill in the blanks with a/an/the.',
        task_jp: 'a/an/the を空欄に入れましょう。',
        answer_key_en: '1. the  2. a  3. an',
      },
      {
        id: 'hw_1',
        task_en: 'Record yourself describing your day.',
        task_jp: '一日の説明を録音しましょう。',
        // open-ended: no answer key
      },
    ],
    next_session_focus: { focus_en: 'Articles in speech.', focus_jp: '会話での冠詞。' },
    instructor_analysis: 'Strong motivation; push on article production, not recognition.',
  };
}

describe('generatedSessionReportSchema', () => {
  test('round-trips a valid report', () => {
    const report = makeFullReport();
    const parsed = generatedSessionReportSchema.parse(report);
    expect(parsed).toEqual(report);
  });

  test('rejects a report missing a required section', () => {
    const report = makeFullReport() as Record<string, unknown>;
    delete report.snapshot;
    expect(() => generatedSessionReportSchema.parse(report)).toThrow();
  });

  test('rejects an unknown pattern_category', () => {
    const report = makeFullReport();
    report.trouble_spots[0].pattern_category = 'nonsense' as never;
    expect(() => generatedSessionReportSchema.parse(report)).toThrow();
  });
});

describe('splitReport', () => {
  test('instructor_json is the full report unchanged', () => {
    const report = makeFullReport();
    const { instructor_json } = splitReport(report);
    expect(instructor_json).toEqual(report);
    expect(instructor_json.instructor_analysis).toBe(report.instructor_analysis);
    expect(instructor_json.homework[0].answer_key_en).toBe('1. the  2. a  3. an');
  });

  test('student_json drops top-level instructor_analysis', () => {
    const { student_json } = splitReport(makeFullReport());
    expect('instructor_analysis' in student_json).toBe(false);
  });

  test('student_json drops every homework answer_key_en', () => {
    const { student_json } = splitReport(makeFullReport());
    for (const hw of student_json.homework) {
      expect('answer_key_en' in hw).toBe(false);
    }
    // Serialized form must not leak the answer key string anywhere.
    expect(JSON.stringify(student_json)).not.toContain('1. the  2. a  3. an');
    expect(JSON.stringify(student_json)).not.toContain('push on article production');
  });

  test('student_json preserves all student-safe content', () => {
    const report = makeFullReport();
    const { student_json } = splitReport(report);
    expect(student_json.snapshot).toEqual(report.snapshot);
    expect(student_json.wins).toEqual(report.wins);
    expect(student_json.trouble_spots).toEqual(report.trouble_spots);
    expect(student_json.recurring_patterns).toEqual(report.recurring_patterns);
    expect(student_json.study_areas).toEqual(report.study_areas);
    expect(student_json.vocabulary).toEqual(report.vocabulary);
    expect(student_json.grammar_points).toEqual(report.grammar_points);
    expect(student_json.next_session_focus).toEqual(report.next_session_focus);
    // Homework tasks survive; only the answer key is removed.
    expect(student_json.homework.map((h) => h.id)).toEqual(['hw_0', 'hw_1']);
    expect(student_json.homework[0].task_en).toBe(report.homework[0].task_en);
  });

  test('does not mutate the input report', () => {
    const report = makeFullReport();
    splitReport(report);
    expect(report.instructor_analysis).toBeTruthy();
    expect(report.homework[0].answer_key_en).toBe('1. the  2. a  3. an');
  });
});
