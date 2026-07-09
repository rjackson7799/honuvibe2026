import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } from 'docx';
import type { Bilingual, ReportDocModel, ReportSection } from './report-document-model';

const JP_FONT = 'Yu Gothic'; // present in Word on Windows/Mac; Word substitutes a JP face otherwise
const EN_FONT = 'Calibri';
const TEAL = '2DD4BF';
const AMBER = 'B45309';

function en(text: string, opts: { bold?: boolean; italics?: boolean; color?: string } = {}): Paragraph {
  return new Paragraph({ children: [new TextRun({ text, font: EN_FONT, ...opts })] });
}

function jp(text: string): Paragraph {
  return new Paragraph({ children: [new TextRun({ text, font: JP_FONT })], spacing: { after: 80 } });
}

function bilingual(b: Bilingual): Paragraph[] {
  return [en(b.en), jp(b.jp)];
}

function sectionHeading(sec: ReportSection): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0' } },
    children: [
      new TextRun({ text: sec.labelEn, font: EN_FONT, bold: true }),
      new TextRun({ text: `  ·  ${sec.labelJp}`, font: JP_FONT, bold: true }),
    ],
  });
}

function renderSection(sec: ReportSection): Paragraph[] {
  const head = sectionHeading(sec);
  switch (sec.type) {
    case 'snapshot':
    case 'next_session':
      return [head, ...bilingual(sec.body)];
    case 'instructor_analysis':
    case 'margin_notes':
      return [head, en(sec.text)];
    case 'wins':
      return [head, ...sec.items.flatMap((it) => [
        ...bilingual(it.text),
        ...(it.quote ? [en(`“${it.quote}”`, { italics: true })] : []),
      ])];
    case 'trouble_spots':
      return [head, ...sec.items.flatMap((it) => [
        en(`${it.patternLabel.en} · ${it.patternLabel.jp}`, { color: TEAL, bold: true }),
        en(`You said: “${it.quote}”`, { italics: true }),
        en(`Try: ${it.correction}`),
        ...bilingual(it.explanation),
      ])];
    case 'recurring_patterns':
      return [head, ...sec.items.flatMap((it) => [en(it.trend, { color: TEAL }), ...bilingual(it.note)])];
    case 'study_areas':
      return [head, ...sec.items.flatMap((it) => [...bilingual(it.area), ...bilingual(it.why)])];
    case 'vocabulary':
      return [head, ...sec.items.flatMap((it) => [
        en(`${it.term.en}${it.reading ? `  ${it.reading}` : ''} — ${it.term.jp}`, { bold: true }),
        ...bilingual(it.example),
      ])];
    case 'grammar_points':
      return [head, ...sec.items.flatMap((it) => [
        en(`${it.title.en} — ${it.title.jp}`, { bold: true }),
        en(it.pattern),
        ...bilingual(it.explanation),
        ...it.examples.flatMap((ex) => bilingual(ex)),
      ])];
    case 'homework':
      return [head, ...sec.items.flatMap((it) => [
        ...bilingual(it.task),
        ...(it.answerKey ? [en(`Answer key: ${it.answerKey}`, { color: AMBER })] : []),
      ])];
    default:
      return [head];
  }
}

export async function generateReportDocx(model: ReportDocModel): Promise<Buffer> {
  const { header } = model;
  const metaParts = [
    header.studentName, header.sessionDate, header.topic,
    header.durationMinutes ? `${header.durationMinutes} min` : null,
  ].filter(Boolean).join('  ·  ');

  const intro: Paragraph[] = [
    new Paragraph({ children: [new TextRun({ text: 'HonuVibe.AI', font: EN_FONT, bold: true, size: 32, color: '1A1F2E' })] }),
    new Paragraph({ children: [new TextRun({ text: '1v1 Session Report', font: EN_FONT, size: 20, color: '64748B' })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: metaParts, font: EN_FONT, size: 18, color: '94A3B8' })], spacing: { after: 160 } }),
  ];

  if (header.variant === 'teacher') {
    intro.push(new Paragraph({
      children: [new TextRun({ text: 'TEACHER COPY — contains answer keys & instructor notes · not for student', font: EN_FONT, bold: true, color: AMBER })],
      spacing: { after: 160 },
    }));
  }

  const doc = new Document({
    creator: 'HonuVibe.AI',
    title: `1v1 Session Report — ${header.studentName}`,
    sections: [{ children: [...intro, ...model.sections.flatMap(renderSection)] }],
  });

  return Packer.toBuffer(doc);
}
