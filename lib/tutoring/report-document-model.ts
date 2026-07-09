import type { GeneratedSessionReport, StudentReport } from './types';

export type DocVariant = 'student' | 'teacher';

export interface Bilingual {
  en: string;
  jp: string;
}

export interface ReportDocHeader {
  studentName: string;
  courseTitleEn: string;
  sessionDate: string; // 'YYYY-MM-DD'
  topic: string | null;
  durationMinutes: number | null;
  variant: DocVariant;
}

export type ReportSection =
  | { type: 'snapshot'; labelEn: string; labelJp: string; body: Bilingual }
  | { type: 'instructor_analysis'; labelEn: string; labelJp: string; text: string }
  | { type: 'wins'; labelEn: string; labelJp: string; items: Array<{ text: Bilingual; quote?: string }> }
  | { type: 'trouble_spots'; labelEn: string; labelJp: string; items: Array<{ quote: string; correction: string; explanation: Bilingual; patternLabel: Bilingual }> }
  | { type: 'recurring_patterns'; labelEn: string; labelJp: string; items: Array<{ note: Bilingual; trend: string }> }
  | { type: 'study_areas'; labelEn: string; labelJp: string; items: Array<{ area: Bilingual; why: Bilingual }> }
  | { type: 'vocabulary'; labelEn: string; labelJp: string; items: Array<{ term: Bilingual; reading?: string; example: Bilingual }> }
  | { type: 'grammar_points'; labelEn: string; labelJp: string; items: Array<{ title: Bilingual; pattern: string; explanation: Bilingual; examples: Bilingual[] }> }
  | { type: 'homework'; labelEn: string; labelJp: string; items: Array<{ task: Bilingual; answerKey?: string }> }
  | { type: 'next_session'; labelEn: string; labelJp: string; body: Bilingual }
  | { type: 'margin_notes'; labelEn: string; labelJp: string; text: string };

export interface ReportDocModel {
  header: ReportDocHeader;
  sections: ReportSection[];
}

export interface BuildReportCtx {
  payload: StudentReport | GeneratedSessionReport;
  studentName: string | null;
  courseTitleEn: string;
  sessionDate: string;
  topic: string | null;
  durationMinutes: number | null;
  marginNotes?: string | null;
}

// Bilingual section labels — the document's own copy (deliberately NOT in messages/*.json).
const L = {
  snapshot: { labelEn: 'Session snapshot', labelJp: 'セッションの概要' },
  instructor_analysis: { labelEn: 'Instructor analysis (teacher only)', labelJp: '講師メモ（講師専用）' },
  wins: { labelEn: 'What went well', labelJp: '良かった点' },
  trouble_spots: { labelEn: 'Things to work on', labelJp: '改善点' },
  recurring_patterns: { labelEn: 'Patterns over time', labelJp: '傾向の推移' },
  study_areas: { labelEn: 'Focus for practice', labelJp: '練習の重点' },
  vocabulary: { labelEn: 'Vocabulary', labelJp: '語彙' },
  grammar_points: { labelEn: 'Grammar points', labelJp: '文法ポイント' },
  homework: { labelEn: 'Homework', labelJp: '宿題' },
  next_session: { labelEn: 'Next session', labelJp: '次回のセッション' },
  margin_notes: { labelEn: 'Margin notes (teacher only)', labelJp: '欄外メモ（講師専用）' },
} as const;

export function buildReportModel(variant: DocVariant, ctx: BuildReportCtx): ReportDocModel {
  const p = ctx.payload;
  const isTeacher = variant === 'teacher';
  const sections: ReportSection[] = [];

  sections.push({ type: 'snapshot', ...L.snapshot, body: { en: p.snapshot.summary_en, jp: p.snapshot.summary_jp } });

  if (isTeacher && 'instructor_analysis' in p && p.instructor_analysis) {
    sections.push({ type: 'instructor_analysis', ...L.instructor_analysis, text: p.instructor_analysis });
  }

  sections.push({
    type: 'wins', ...L.wins,
    items: p.wins.map((w) => ({ text: { en: w.win_en, jp: w.win_jp }, quote: w.quote })),
  });

  sections.push({
    type: 'trouble_spots', ...L.trouble_spots,
    items: p.trouble_spots.map((t) => ({
      quote: t.quote, correction: t.correction,
      explanation: { en: t.explanation_en, jp: t.explanation_jp },
      patternLabel: { en: t.pattern_label_en, jp: t.pattern_label_jp },
    })),
  });

  sections.push({
    type: 'recurring_patterns', ...L.recurring_patterns,
    items: p.recurring_patterns.map((r) => ({ note: { en: r.note_en, jp: r.note_jp }, trend: r.trend })),
  });

  sections.push({
    type: 'study_areas', ...L.study_areas,
    items: p.study_areas.map((s) => ({ area: { en: s.area_en, jp: s.area_jp }, why: { en: s.why_en, jp: s.why_jp } })),
  });

  sections.push({
    type: 'vocabulary', ...L.vocabulary,
    items: p.vocabulary.map((v) => ({ term: { en: v.term_en, jp: v.term_jp }, reading: v.reading_en, example: { en: v.example_en, jp: v.example_jp } })),
  });

  sections.push({
    type: 'grammar_points', ...L.grammar_points,
    items: p.grammar_points.map((g) => ({
      title: { en: g.title_en, jp: g.title_jp }, pattern: g.pattern,
      explanation: { en: g.explanation_en, jp: g.explanation_jp },
      examples: g.examples.map((e) => ({ en: e.sentence_en, jp: e.sentence_jp })),
    })),
  });

  sections.push({
    type: 'homework', ...L.homework,
    items: p.homework.map((h) => ({
      task: { en: h.task_en, jp: h.task_jp },
      answerKey: isTeacher && 'answer_key_en' in h ? h.answer_key_en : undefined,
    })),
  });

  sections.push({ type: 'next_session', ...L.next_session, body: { en: p.next_session_focus.focus_en, jp: p.next_session_focus.focus_jp } });

  if (isTeacher && ctx.marginNotes && ctx.marginNotes.trim()) {
    sections.push({ type: 'margin_notes', ...L.margin_notes, text: ctx.marginNotes });
  }

  return {
    header: {
      studentName: ctx.studentName ?? 'Student',
      courseTitleEn: ctx.courseTitleEn,
      sessionDate: ctx.sessionDate,
      topic: ctx.topic,
      durationMinutes: ctx.durationMinutes,
      variant,
    },
    sections,
  };
}
