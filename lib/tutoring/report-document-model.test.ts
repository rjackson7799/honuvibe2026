import { describe, expect, test } from 'vitest';
import type { GeneratedSessionReport } from './types';
import { buildReportModel, type BuildReportCtx } from './report-document-model';
import { splitReport } from './split';

function makeFullReport(): GeneratedSessionReport {
  return {
    snapshot: { summary_en: 'Great session.', summary_jp: '良いセッションでした。' },
    wins: [{ win_en: 'Clear intros', win_jp: '明確な自己紹介', quote: 'Hello, I am Shiori.' }],
    trouble_spots: [{
      id: 'trouble_0', quote: 'I went to store', correction: 'I went to the store.',
      explanation_en: 'Needs an article.', explanation_jp: '冠詞が必要です。',
      pattern_category: 'articles', pattern_label_en: 'Articles', pattern_label_jp: '冠詞',
    }],
    recurring_patterns: [{ category: 'articles', note_en: 'Dropping "the".', note_jp: '「the」脱落。', trend: 'persistent' }],
    study_areas: [{ area_en: 'Articles', area_jp: '冠詞', why_en: 'Frequent.', why_jp: '頻出。' }],
    vocabulary: [{ id: 'vocab_0', term_en: 'inventory', term_jp: '在庫', reading_en: '/ˈɪnvəntɔːri/', example_en: 'We checked the inventory.', example_jp: '在庫を確認しました。' }],
    grammar_points: [{ id: 'grammar_0', title_en: 'Definite article', title_jp: '定冠詞', pattern: 'the + noun', explanation_en: 'Specific noun.', explanation_jp: '特定の名詞。', examples: [{ sentence_en: 'the store', sentence_jp: 'その店' }] }],
    homework: [{ id: 'hw_0', task_en: 'Fill in a/an/the.', task_jp: 'a/an/the を入れましょう。', answer_key_en: '1. the  2. a  3. an' }],
    next_session_focus: { focus_en: 'Articles in speech.', focus_jp: '会話での冠詞。' },
    instructor_analysis: 'Push on article production, not recognition.',
  };
}

const baseCtx = (payload: BuildReportCtx['payload'], marginNotes?: string | null): BuildReportCtx => ({
  payload, studentName: 'Shiori', courseTitleEn: 'Private Tutoring',
  sessionDate: '2026-07-08', topic: 'Articles', durationMinutes: 60, marginNotes,
});

describe('buildReportModel', () => {
  test('student model omits instructor_analysis, answer keys, and margin notes', () => {
    const { student_json } = splitReport(makeFullReport());
    const model = buildReportModel('student', baseCtx(student_json, 'private teacher note'));
    const serialized = JSON.stringify(model);
    expect(serialized).not.toContain('Push on article production');
    expect(serialized).not.toContain('1. the  2. a  3. an');
    expect(serialized).not.toContain('private teacher note');
    expect(model.sections.some((s) => s.type === 'instructor_analysis')).toBe(false);
    expect(model.sections.some((s) => s.type === 'margin_notes')).toBe(false);
    const hw = model.sections.find((s) => s.type === 'homework');
    expect(hw && hw.type === 'homework' && hw.items.every((i) => i.answerKey === undefined)).toBe(true);
  });

  test('teacher model includes instructor analysis, answer keys, and margin notes', () => {
    const model = buildReportModel('teacher', baseCtx(makeFullReport(), 'private teacher note'));
    const serialized = JSON.stringify(model);
    expect(serialized).toContain('Push on article production');
    expect(serialized).toContain('1. the  2. a  3. an');
    expect(serialized).toContain('private teacher note');
    expect(model.sections.some((s) => s.type === 'instructor_analysis')).toBe(true);
    expect(model.sections.some((s) => s.type === 'margin_notes')).toBe(true);
  });

  test('teacher model omits margin_notes section when notes are empty/whitespace', () => {
    const model = buildReportModel('teacher', baseCtx(makeFullReport(), '   '));
    expect(model.sections.some((s) => s.type === 'margin_notes')).toBe(false);
  });

  test('section order matches the dashboard order', () => {
    const model = buildReportModel('teacher', baseCtx(makeFullReport(), 'note'));
    expect(model.sections.map((s) => s.type)).toEqual([
      'snapshot', 'instructor_analysis', 'wins', 'trouble_spots', 'recurring_patterns',
      'study_areas', 'vocabulary', 'grammar_points', 'homework', 'next_session', 'margin_notes',
    ]);
  });

  test('header carries variant and meta', () => {
    const { student_json } = splitReport(makeFullReport());
    const model = buildReportModel('student', baseCtx(student_json));
    expect(model.header.variant).toBe('student');
    expect(model.header.studentName).toBe('Shiori');
    expect(model.header.sessionDate).toBe('2026-07-08');
  });
});
