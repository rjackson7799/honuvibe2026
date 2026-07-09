import React from 'react';
import { renderToBuffer, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { registerFonts } from '@/lib/pdf/fonts';
import type { Bilingual, ReportDocModel, ReportSection } from './report-document-model';

const TEAL = '#2dd4bf';
const DARK_BG = '#1a1f2e';
const AMBER = '#b45309';
const AMBER_BG = '#fef3c7';
const TEXT = '#334155';
const MUTED = '#94a3b8';
const SECONDARY = '#64748b';
const BORDER = '#e2e8f0';
const WHITE = '#ffffff';

const s = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 64, paddingHorizontal: 48, fontFamily: 'DM Sans', fontSize: 10, color: TEXT, backgroundColor: WHITE },
  headerBar: { backgroundColor: DARK_BG, marginHorizontal: -48, marginTop: -48, paddingHorizontal: 48, paddingVertical: 24, marginBottom: 16 },
  brandName: { fontFamily: 'DM Sans', fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 4 },
  brandAccent: { color: TEAL },
  docLabel: { fontFamily: 'DM Sans', fontSize: 8, color: MUTED, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  metaLine: { fontSize: 9, color: MUTED, marginTop: 2 },
  teacherBand: { backgroundColor: AMBER_BG, marginHorizontal: -48, paddingHorizontal: 48, paddingVertical: 6, marginBottom: 12 },
  teacherBandText: { fontSize: 9, fontWeight: 700, color: AMBER },
  sectionTitle: { fontFamily: 'DM Serif Display', fontSize: 13, color: DARK_BG, marginTop: 16, marginBottom: 6, paddingBottom: 3, borderBottom: `1px solid ${BORDER}` },
  en: { fontFamily: 'DM Sans', fontSize: 10, lineHeight: 1.5, color: TEXT, marginBottom: 2 },
  jp: { fontFamily: 'Noto Sans JP', fontSize: 10, lineHeight: 1.7, color: SECONDARY, marginBottom: 4 },
  mono: { fontFamily: 'DM Sans', fontSize: 9, color: SECONDARY, marginBottom: 2 },
  item: { marginBottom: 6, paddingLeft: 8, borderLeft: `1px solid ${BORDER}` },
  quote: { fontSize: 9, fontStyle: 'italic', color: SECONDARY, marginBottom: 2 },
  tag: { fontSize: 8, color: TEAL, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  answerKey: { fontSize: 9, color: AMBER, marginTop: 2 },
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', borderTop: `1px solid ${BORDER}`, paddingTop: 8 },
  footerText: { fontSize: 7, color: MUTED },
});

const h = React.createElement;

function bilingual(b: Bilingual, key: string): React.ReactNode {
  return h(View, { key },
    h(Text, { style: s.en }, b.en),
    h(Text, { style: s.jp }, b.jp),
  );
}

function renderSection(sec: ReportSection, i: number): React.ReactNode {
  const title = h(Text, { style: s.sectionTitle }, `${sec.labelEn} · ${sec.labelJp}`);
  switch (sec.type) {
    case 'snapshot':
    case 'next_session':
      return h(View, { key: i, wrap: false }, title, bilingual(sec.body, `${i}-b`));
    case 'instructor_analysis':
    case 'margin_notes':
      return h(View, { key: i }, title, h(Text, { style: s.en }, sec.text));
    case 'wins':
      return h(View, { key: i }, title, ...sec.items.map((it, j) =>
        h(View, { key: j, style: s.item },
          bilingual(it.text, `${i}-${j}-t`),
          it.quote ? h(Text, { style: s.quote }, `“${it.quote}”`) : null,
        )));
    case 'trouble_spots':
      return h(View, { key: i }, title, ...sec.items.map((it, j) =>
        h(View, { key: j, style: s.item },
          h(Text, { style: s.tag }, `${it.patternLabel.en} · ${it.patternLabel.jp}`),
          h(Text, { style: s.quote }, `You said: “${it.quote}”`),
          h(Text, { style: s.en }, `Try: ${it.correction}`),
          bilingual(it.explanation, `${i}-${j}-e`),
        )));
    case 'recurring_patterns':
      return h(View, { key: i }, title, ...sec.items.map((it, j) =>
        h(View, { key: j, style: s.item },
          h(Text, { style: s.tag }, it.trend),
          bilingual(it.note, `${i}-${j}-n`),
        )));
    case 'study_areas':
      return h(View, { key: i }, title, ...sec.items.map((it, j) =>
        h(View, { key: j, style: s.item },
          bilingual(it.area, `${i}-${j}-a`),
          bilingual(it.why, `${i}-${j}-w`),
        )));
    case 'vocabulary':
      return h(View, { key: i }, title, ...sec.items.map((it, j) =>
        h(View, { key: j, style: s.item },
          h(Text, { style: s.en }, `${it.term.en}${it.reading ? `  ${it.reading}` : ''} — ${it.term.jp}`),
          bilingual(it.example, `${i}-${j}-x`),
        )));
    case 'grammar_points':
      return h(View, { key: i }, title, ...sec.items.map((it, j) =>
        h(View, { key: j, style: s.item },
          h(Text, { style: s.en }, `${it.title.en} — ${it.title.jp}`),
          h(Text, { style: s.mono }, it.pattern),
          bilingual(it.explanation, `${i}-${j}-e`),
          ...it.examples.map((ex, k) => bilingual(ex, `${i}-${j}-ex-${k}`)),
        )));
    case 'homework':
      return h(View, { key: i }, title, ...sec.items.map((it, j) =>
        h(View, { key: j, style: s.item },
          bilingual(it.task, `${i}-${j}-t`),
          it.answerKey ? h(Text, { style: s.answerKey }, `Answer key: ${it.answerKey}`) : null,
        )));
    default:
      return null;
  }
}

export async function generateReportPdf(model: ReportDocModel): Promise<Buffer> {
  registerFonts();
  const { header } = model;
  const isTeacher = header.variant === 'teacher';
  const metaParts = [
    header.studentName,
    header.sessionDate,
    header.topic,
    header.durationMinutes ? `${header.durationMinutes} min` : null,
  ].filter(Boolean).join('  ·  ');

  const doc = h(Document, { title: `1v1 Session Report — ${header.studentName}`, author: 'HonuVibe.AI' },
    h(Page, { size: 'A4', style: s.page, wrap: true },
      h(View, { style: s.headerBar, fixed: true },
        h(Text, { style: s.brandName }, 'HonuVibe', h(Text, { style: s.brandAccent }, '.AI')),
        h(Text, { style: s.docLabel }, '1v1 Session Report'),
        h(Text, { style: s.metaLine }, metaParts),
      ),
      isTeacher
        ? h(View, { style: s.teacherBand },
            h(Text, { style: s.teacherBandText }, 'TEACHER COPY — contains answer keys & instructor notes · not for student'))
        : null,
      ...model.sections.map((sec, i) => renderSection(sec, i)),
      h(View, { style: s.footer, fixed: true },
        h(Text, { style: s.footerText }, 'HonuVibe.AI — Private Tutoring'),
        h(Text, { style: s.footerText, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` }),
      ),
    ),
  );

  const buffer = await renderToBuffer(doc);
  return Buffer.from(buffer);
}
