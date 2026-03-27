import React from 'react';
import { renderToBuffer, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { registerFonts } from '@/lib/syllabus/fonts';
import type { TeachingMaterialInput } from './types';

// Brand colors (matching syllabus)
const TEAL = '#2dd4bf';
const DARK_BG = '#1a1f2e';
const TEXT_PRIMARY = '#334155';
const TEXT_SECONDARY = '#64748b';
const TEXT_MUTED = '#94a3b8';
const BORDER = '#e2e8f0';
const WHITE = '#ffffff';
const LIGHT_BG = '#f8fafc';

const styles = StyleSheet.create({
  // Landscape slide page
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 56,
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: TEXT_PRIMARY,
    backgroundColor: WHITE,
  },
  pageJp: {
    fontFamily: 'Noto Sans JP',
    lineHeight: 1.7,
  },

  // Title slide
  titleSlideHeader: {
    backgroundColor: DARK_BG,
    marginHorizontal: -56,
    marginTop: -40,
    paddingHorizontal: 56,
    paddingTop: 80,
    paddingBottom: 60,
  },
  brandName: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: 700,
    color: WHITE,
    marginBottom: 24,
  },
  brandAccent: {
    color: TEAL,
  },
  slideLabel: {
    fontFamily: 'DM Sans',
    fontSize: 10,
    color: TEAL,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
  },
  titleSlideTitle: {
    fontFamily: 'DM Serif Display',
    fontSize: 32,
    color: WHITE,
    marginBottom: 8,
  },
  titleSlideSubtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginBottom: 24,
  },
  titleSlideMeta: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 16,
  },
  titleSlideMetaItem: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
  titleSlideMetaValue: {
    color: WHITE,
    fontWeight: 600,
  },

  // Generic slide header
  slideHeader: {
    borderBottom: `2px solid ${TEAL}`,
    paddingBottom: 10,
    marginBottom: 20,
  },
  slideTitle: {
    fontFamily: 'DM Serif Display',
    fontSize: 24,
    color: DARK_BG,
  },
  slideSubtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 4,
  },

  // Agenda items
  agendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderRadius: 4,
  },
  agendaItemAlt: {
    backgroundColor: LIGHT_BG,
  },
  agendaNumber: {
    fontSize: 18,
    fontWeight: 700,
    color: TEAL,
    width: 36,
  },
  agendaTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: TEXT_PRIMARY,
    flex: 1,
  },
  agendaTime: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },

  // Topic slide
  topicHeading: {
    fontFamily: 'DM Serif Display',
    fontSize: 22,
    color: DARK_BG,
    marginBottom: 16,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 16,
    fontSize: 14,
    color: TEAL,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 1.5,
    color: TEXT_PRIMARY,
  },
  discussionBox: {
    marginTop: 20,
    padding: 14,
    backgroundColor: LIGHT_BG,
    borderRadius: 6,
    borderLeft: `3px solid ${TEAL}`,
  },
  discussionLabel: {
    fontSize: 9,
    color: TEAL,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  discussionText: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    lineHeight: 1.5,
  },

  // Materials slide
  materialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 4,
  },
  materialCheck: {
    fontSize: 14,
    color: TEAL,
    marginRight: 10,
  },
  materialText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
  },

  // Wrap-up slide
  takeawayItem: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingLeft: 4,
  },
  takeawayDot: {
    width: 16,
    fontSize: 14,
    color: TEAL,
  },
  takeawayText: {
    flex: 1,
    fontSize: 15,
    fontWeight: 600,
    color: TEXT_PRIMARY,
  },
  nextSessionBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: DARK_BG,
    borderRadius: 6,
  },
  nextSessionLabel: {
    fontSize: 9,
    color: TEAL,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  nextSessionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: WHITE,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 56,
    right: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: TEXT_MUTED,
  },
  pageNumber: {
    fontSize: 8,
    color: TEXT_MUTED,
  },
});

function getStrings(locale: string) {
  if (locale === 'ja') {
    return {
      teacherPresentation: '講師用プレゼンテーション',
      agenda: 'アジェンダ',
      minutes: (n: number) => `${n}分`,
      session: (n: number) => `セッション${n}`,
      materials: '必要な教材・ツール',
      discussionPrompts: 'ディスカッションのポイント',
      wrapUp: 'まとめ',
      keyTakeaways: '重要なポイント',
      nextSession: '次のセッション',
      footerOrg: 'HonuVibe.AI | ホノルル、ハワイ',
      instructor: '講師',
      date: '日付',
      duration: '時間',
      format: '形式',
    };
  }
  return {
    teacherPresentation: "Teacher's Presentation",
    agenda: 'Agenda',
    minutes: (n: number) => `${n} min`,
    session: (n: number) => `Session ${n}`,
    materials: 'Materials & Tools Needed',
    discussionPrompts: 'Discussion Prompts',
    wrapUp: 'Wrap-Up',
    keyTakeaways: 'Key Takeaways',
    nextSession: 'Next Session',
    footerOrg: 'HonuVibe.AI | Honolulu, Hawaii',
    instructor: 'Instructor',
    date: 'Date',
    duration: 'Duration',
    format: 'Format',
  };
}

export async function generatePresentation(input: TeachingMaterialInput): Promise<Buffer> {
  registerFonts();
  const s = getStrings(input.locale);
  const isJp = input.locale === 'ja';
  const pageStyle = isJp ? { ...styles.page, ...styles.pageJp } : styles.page;

  // Calculate time per topic
  const topicCount = input.topics.length || 1;
  const timePerTopic = input.sessionDuration
    ? Math.floor(input.sessionDuration / topicCount)
    : null;

  const formattedDate = input.scheduledAt
    ? new Date(input.scheduledAt).toLocaleDateString(isJp ? 'ja-JP' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const slides: React.ReactElement[] = [];

  // --- Slide 1: Title ---
  slides.push(
    React.createElement(
      Page,
      { key: 'title', size: 'A4', orientation: 'landscape', style: pageStyle },
      React.createElement(
        View,
        { style: styles.titleSlideHeader },
        React.createElement(
          Text,
          { style: styles.brandName },
          'HonuVibe',
          React.createElement(Text, { style: styles.brandAccent }, '.AI'),
        ),
        React.createElement(Text, { style: styles.slideLabel }, s.teacherPresentation),
        React.createElement(
          Text,
          { style: styles.titleSlideTitle },
          `${s.session(input.sessionNumber)}: ${input.sessionTitle}`,
        ),
        React.createElement(Text, { style: styles.titleSlideSubtitle }, input.courseName),
        React.createElement(
          View,
          { style: styles.titleSlideMeta },
          React.createElement(
            Text,
            { style: styles.titleSlideMetaItem },
            React.createElement(Text, { style: styles.titleSlideMetaValue }, input.instructorName),
          ),
          formattedDate
            ? React.createElement(
                Text,
                { style: styles.titleSlideMetaItem },
                React.createElement(Text, { style: styles.titleSlideMetaValue }, formattedDate),
              )
            : null,
          input.sessionDuration
            ? React.createElement(
                Text,
                { style: styles.titleSlideMetaItem },
                React.createElement(Text, { style: styles.titleSlideMetaValue }, s.minutes(input.sessionDuration)),
              )
            : null,
          React.createElement(
            Text,
            { style: styles.titleSlideMetaItem },
            React.createElement(Text, { style: styles.titleSlideMetaValue }, input.sessionFormat),
          ),
        ),
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, { style: styles.footerText }, s.footerOrg),
      ),
    ),
  );

  // --- Slide 2: Agenda ---
  if (input.topics.length > 0) {
    slides.push(
      React.createElement(
        Page,
        { key: 'agenda', size: 'A4', orientation: 'landscape', style: pageStyle },
        React.createElement(
          View,
          { style: styles.slideHeader },
          React.createElement(Text, { style: styles.slideTitle }, s.agenda),
        ),
        ...input.topics.map((topic, i) =>
          React.createElement(
            View,
            {
              key: `agenda-${i}`,
              style: i % 2 === 1
                ? { ...styles.agendaItem, ...styles.agendaItemAlt }
                : styles.agendaItem,
            },
            React.createElement(Text, { style: styles.agendaNumber }, `${i + 1}`),
            React.createElement(Text, { style: styles.agendaTitle }, topic.title),
            timePerTopic
              ? React.createElement(Text, { style: styles.agendaTime }, `~${s.minutes(timePerTopic)}`)
              : null,
          ),
        ),
        React.createElement(
          View,
          { style: styles.footer, fixed: true },
          React.createElement(Text, { style: styles.footerText }, s.footerOrg),
          React.createElement(
            Text,
            {
              style: styles.pageNumber,
              render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
                `${pageNumber} / ${totalPages}`,
            },
          ),
        ),
      ),
    );
  }

  // --- Slides 3+: One per topic ---
  for (let i = 0; i < input.topics.length; i++) {
    const topic = input.topics[i];
    // Pick one discussion prompt per topic slide
    const promptIndex = i % (isJp ? 5 : 5);
    const promptTemplates = isJp
      ? [
          `${topic.title}について、学生にどのような質問をしますか？`,
          `${topic.title}の実践的な応用例は？`,
          `${topic.title}で最も重要なポイントは何ですか？`,
          `学生が${topic.title}で苦労しそうな点は？`,
          `${topic.title}を理解しているか確認する方法は？`,
        ]
      : [
          `What questions would you ask students about ${topic.title}?`,
          `What real-world examples illustrate ${topic.title}?`,
          `What is the most important takeaway from ${topic.title}?`,
          `Where might students struggle with ${topic.title}?`,
          `How can you verify understanding of ${topic.title}?`,
        ];

    slides.push(
      React.createElement(
        Page,
        { key: `topic-${i}`, size: 'A4', orientation: 'landscape', style: pageStyle },
        React.createElement(
          View,
          { style: styles.slideHeader },
          React.createElement(Text, { style: styles.slideTitle }, topic.title),
          timePerTopic
            ? React.createElement(Text, { style: styles.slideSubtitle }, `~${s.minutes(timePerTopic)}`)
            : null,
        ),
        // Subtopics as bullet points
        ...(topic.subtopics ?? []).map((sub, si) =>
          React.createElement(
            View,
            { key: `sub-${si}`, style: styles.bulletItem },
            React.createElement(Text, { style: styles.bulletDot }, '\u2022'),
            React.createElement(Text, { style: styles.bulletText }, sub),
          ),
        ),
        // Discussion prompt
        React.createElement(
          View,
          { style: styles.discussionBox },
          React.createElement(Text, { style: styles.discussionLabel }, s.discussionPrompts),
          React.createElement(Text, { style: styles.discussionText }, promptTemplates[promptIndex]),
        ),
        // Footer
        React.createElement(
          View,
          { style: styles.footer, fixed: true },
          React.createElement(Text, { style: styles.footerText }, s.footerOrg),
          React.createElement(
            Text,
            {
              style: styles.pageNumber,
              render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
                `${pageNumber} / ${totalPages}`,
            },
          ),
        ),
      ),
    );
  }

  // --- Materials slide (if any) ---
  if (input.materials.length > 0) {
    slides.push(
      React.createElement(
        Page,
        { key: 'materials', size: 'A4', orientation: 'landscape', style: pageStyle },
        React.createElement(
          View,
          { style: styles.slideHeader },
          React.createElement(Text, { style: styles.slideTitle }, s.materials),
        ),
        ...input.materials.map((mat, i) =>
          React.createElement(
            View,
            { key: `mat-${i}`, style: styles.materialItem },
            React.createElement(Text, { style: styles.materialCheck }, '\u2610'),
            React.createElement(Text, { style: styles.materialText }, mat),
          ),
        ),
        React.createElement(
          View,
          { style: styles.footer, fixed: true },
          React.createElement(Text, { style: styles.footerText }, s.footerOrg),
          React.createElement(
            Text,
            {
              style: styles.pageNumber,
              render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
                `${pageNumber} / ${totalPages}`,
            },
          ),
        ),
      ),
    );
  }

  // --- Wrap-Up slide ---
  slides.push(
    React.createElement(
      Page,
      { key: 'wrapup', size: 'A4', orientation: 'landscape', style: pageStyle },
      React.createElement(
        View,
        { style: styles.slideHeader },
        React.createElement(Text, { style: styles.slideTitle }, s.wrapUp),
      ),
      // Key takeaways from topic titles
      React.createElement(
        View,
        null,
        ...input.topics.map((topic, i) =>
          React.createElement(
            View,
            { key: `tw-${i}`, style: styles.takeawayItem },
            React.createElement(Text, { style: styles.takeawayDot }, '\u2713'),
            React.createElement(Text, { style: styles.takeawayText }, topic.title),
          ),
        ),
      ),
      // Next session preview
      input.nextSessionTitle
        ? React.createElement(
            View,
            { style: styles.nextSessionBox },
            React.createElement(Text, { style: styles.nextSessionLabel }, s.nextSession),
            React.createElement(Text, { style: styles.nextSessionTitle }, input.nextSessionTitle),
          )
        : null,
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, { style: styles.footerText }, s.footerOrg),
        React.createElement(
          Text,
          {
            style: styles.pageNumber,
            render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `${pageNumber} / ${totalPages}`,
          },
        ),
      ),
    ),
  );

  const doc = React.createElement(
    Document,
    {
      title: `${s.session(input.sessionNumber)}: ${input.sessionTitle} - ${s.teacherPresentation}`,
      author: 'HonuVibe.AI',
    },
    ...slides,
  );

  const buffer = await renderToBuffer(doc);
  return Buffer.from(buffer);
}
