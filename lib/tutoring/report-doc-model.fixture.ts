import type { ReportDocModel } from './report-document-model';

// Minimal but representative model for renderer tests: exercises all three
// registered font families (DM Serif Display section titles, DM Sans EN body,
// Noto Sans JP body) plus the CJK hyphenation path.
export function sampleReportDocModel(): ReportDocModel {
  return {
    header: {
      studentName: 'Test1v1',
      courseTitleEn: 'Private Tutoring',
      sessionDate: '2026-07-08',
      topic: 'TestTopic',
      durationMinutes: null,
      variant: 'student',
    },
    sections: [
      {
        type: 'snapshot',
        labelEn: 'Session snapshot',
        labelJp: 'セッションの概要',
        body: { en: 'A short productive session.', jp: '短いながらも充実したセッションでした。' },
      },
      {
        type: 'wins',
        labelEn: 'What went well',
        labelJp: '良かった点',
        items: [{ text: { en: 'Clear self-introduction', jp: 'はっきりとした自己紹介ができた' }, quote: 'Nice to meet you' }],
      },
      {
        type: 'next_session',
        labelEn: 'Next session',
        labelJp: '次回のセッション',
        body: { en: 'Review particles.', jp: '助詞の復習をします。' },
      },
    ],
  };
}
