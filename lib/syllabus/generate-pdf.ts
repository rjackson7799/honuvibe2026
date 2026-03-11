import React from 'react';
import { renderToBuffer, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { registerFonts } from './fonts';
import { getSyllabusStrings } from './strings';
import type { CourseWithCurriculum } from '@/lib/courses/types';

// Resolve bilingual field based on locale
function localized(en: string | null | undefined, jp: string | null | undefined, locale: string): string {
  if (locale === 'ja' && jp) return jp;
  return en ?? '';
}

function localizedArray(en: string[] | null | undefined, jp: string[] | null | undefined, locale: string): string[] {
  if (locale === 'ja' && jp && jp.length > 0) return jp;
  return en ?? [];
}

// Brand colors
const TEAL = '#2dd4bf';
const DARK_BG = '#1a1f2e';
const TEXT_PRIMARY = '#334155';
const TEXT_SECONDARY = '#64748b';
const TEXT_MUTED = '#94a3b8';
const BORDER = '#e2e8f0';
const WHITE = '#ffffff';

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 48,
    fontFamily: 'DM Sans',
    fontSize: 10,
    color: TEXT_PRIMARY,
    backgroundColor: WHITE,
  },
  pageJp: {
    fontFamily: 'Noto Sans JP',
    lineHeight: 1.7,
  },

  // Header
  headerBar: {
    backgroundColor: DARK_BG,
    marginHorizontal: -48,
    marginTop: -48,
    paddingHorizontal: 48,
    paddingVertical: 24,
    marginBottom: 24,
  },
  brandName: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: 700,
    color: WHITE,
    marginBottom: 4,
  },
  brandAccent: {
    color: TEAL,
  },
  syllabusLabel: {
    fontFamily: 'DM Sans',
    fontSize: 8,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  courseTitle: {
    fontFamily: 'DM Serif Display',
    fontSize: 22,
    color: WHITE,
    marginBottom: 4,
  },
  courseCode: {
    fontSize: 9,
    color: TEXT_MUTED,
  },
  overline: {
    fontSize: 8,
    color: TEAL,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 8,
  },

  // Meta grid
  metaRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  metaItem: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderLeft: `2px solid ${TEAL}`,
  },
  metaLabel: {
    fontSize: 7,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 600,
    color: TEXT_PRIMARY,
  },

  // Sections
  sectionTitle: {
    fontFamily: 'DM Serif Display',
    fontSize: 14,
    color: DARK_BG,
    marginBottom: 8,
    marginTop: 20,
    paddingBottom: 4,
    borderBottom: `1px solid ${BORDER}`,
  },
  description: {
    fontSize: 10,
    lineHeight: 1.6,
    color: TEXT_SECONDARY,
    marginBottom: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 12,
    fontSize: 10,
    color: TEAL,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.5,
    color: TEXT_PRIMARY,
  },

  // Tools
  toolsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  toolBadge: {
    fontSize: 8,
    color: TEXT_PRIMARY,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    border: `1px solid ${BORDER}`,
  },

  // Week
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK_BG,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginTop: 12,
    marginBottom: 6,
  },
  weekNumber: {
    fontSize: 10,
    fontWeight: 700,
    color: TEAL,
    marginRight: 8,
  },
  weekTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: WHITE,
    flex: 1,
  },
  weekPhase: {
    fontSize: 8,
    color: TEXT_MUTED,
  },

  // Session
  sessionBlock: {
    paddingLeft: 12,
    paddingVertical: 6,
    borderLeft: `1px solid ${BORDER}`,
    marginLeft: 6,
    marginBottom: 4,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  sessionNumber: {
    fontSize: 8,
    color: TEAL,
    fontWeight: 600,
    marginRight: 6,
  },
  sessionTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: TEXT_PRIMARY,
    flex: 1,
  },
  sessionMeta: {
    fontSize: 8,
    color: TEXT_MUTED,
  },
  topicItem: {
    fontSize: 9,
    color: TEXT_SECONDARY,
    marginLeft: 12,
    marginBottom: 2,
  },
  subtopicItem: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginLeft: 24,
    marginBottom: 1,
  },

  // Assignment
  assignmentItem: {
    fontSize: 9,
    color: TEXT_SECONDARY,
    paddingLeft: 12,
    marginLeft: 6,
    marginBottom: 2,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: `1px solid ${BORDER}`,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: TEXT_MUTED,
  },
  pageNumber: {
    fontSize: 7,
    color: TEXT_MUTED,
  },
});

export async function generateSyllabusPdf(
  course: CourseWithCurriculum,
  locale: string,
): Promise<Buffer> {
  registerFonts();
  const s = getSyllabusStrings(locale);
  const isJp = locale === 'ja';
  const year = new Date().getFullYear();
  const today = new Date().toLocaleDateString(isJp ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const title = localized(course.title_en, course.title_jp, locale);
  const description = localized(course.description_en, course.description_jp, locale);
  const prerequisites = localized(course.prerequisites_en, course.prerequisites_jp, locale);
  const learningOutcomes = localizedArray(course.learning_outcomes_en, course.learning_outcomes_jp, locale);
  const whoIsFor = localizedArray(course.who_is_for_en, course.who_is_for_jp, locale);

  const pageStyle = isJp ? { ...styles.page, ...styles.pageJp } : styles.page;

  const overlineParts = [
    course.level?.toUpperCase(),
    course.format?.toUpperCase(),
    course.total_weeks ? s.weeks(course.total_weeks) : null,
    course.language === 'both' ? 'EN/JP' : course.language?.toUpperCase(),
  ].filter(Boolean).join(' \u00B7 ');

  const startDateFormatted = course.start_date
    ? new Date(course.start_date).toLocaleDateString(isJp ? 'ja-JP' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const doc = React.createElement(
    Document,
    { title: `${title} - ${s.courseSyllabus}`, author: 'HonuVibe.AI' },
    React.createElement(
      Page,
      { size: 'A4', style: pageStyle, wrap: true },

      // Header bar
      React.createElement(
        View,
        { style: styles.headerBar, fixed: true },
        React.createElement(
          Text,
          { style: styles.brandName },
          'HonuVibe',
          React.createElement(Text, { style: styles.brandAccent }, '.AI'),
        ),
        React.createElement(Text, { style: styles.syllabusLabel }, s.courseSyllabus),
        React.createElement(Text, { style: styles.courseTitle }, title),
        course.course_id_code
          ? React.createElement(Text, { style: styles.courseCode }, course.course_id_code)
          : null,
        React.createElement(Text, { style: styles.overline }, overlineParts),
      ),

      // Meta grid
      React.createElement(
        View,
        { style: styles.metaRow },
        course.instructor_name
          ? React.createElement(
              View,
              { style: styles.metaItem },
              React.createElement(Text, { style: styles.metaLabel }, s.instructor),
              React.createElement(Text, { style: styles.metaValue }, course.instructor_name),
            )
          : null,
        startDateFormatted
          ? React.createElement(
              View,
              { style: styles.metaItem },
              React.createElement(Text, { style: styles.metaLabel }, s.startDate),
              React.createElement(Text, { style: styles.metaValue }, startDateFormatted),
            )
          : null,
        course.level
          ? React.createElement(
              View,
              { style: styles.metaItem },
              React.createElement(Text, { style: styles.metaLabel }, s.level),
              React.createElement(Text, { style: styles.metaValue }, course.level),
            )
          : null,
        course.live_sessions_count
          ? React.createElement(
              View,
              { style: styles.metaItem },
              React.createElement(Text, { style: styles.metaLabel }, s.format),
              React.createElement(Text, { style: styles.metaValue }, s.liveSessions(course.live_sessions_count)),
            )
          : null,
      ),

      // Overview
      description
        ? React.createElement(
            View,
            null,
            React.createElement(Text, { style: styles.sectionTitle }, s.overview),
            React.createElement(Text, { style: styles.description }, description),
          )
        : null,

      // Who is this for
      whoIsFor.length > 0
        ? React.createElement(
            View,
            null,
            ...whoIsFor.map((item, i) =>
              React.createElement(
                View,
                { key: `who-${i}`, style: styles.bulletItem },
                React.createElement(Text, { style: styles.bulletDot }, '\u2022'),
                React.createElement(Text, { style: styles.bulletText }, item),
              ),
            ),
          )
        : null,

      // Prerequisites
      prerequisites
        ? React.createElement(
            View,
            null,
            React.createElement(Text, { style: styles.sectionTitle }, s.prerequisites),
            React.createElement(Text, { style: styles.description }, prerequisites),
          )
        : null,

      // Learning Outcomes
      learningOutcomes.length > 0
        ? React.createElement(
            View,
            null,
            React.createElement(Text, { style: styles.sectionTitle }, s.learningOutcomes),
            ...learningOutcomes.map((outcome, i) =>
              React.createElement(
                View,
                { key: `lo-${i}`, style: styles.bulletItem },
                React.createElement(Text, { style: styles.bulletDot }, '\u2022'),
                React.createElement(Text, { style: styles.bulletText }, outcome),
              ),
            ),
          )
        : null,

      // Tools
      course.tools_covered && course.tools_covered.length > 0
        ? React.createElement(
            View,
            null,
            React.createElement(Text, { style: styles.sectionTitle }, s.toolsAndTechnologies),
            React.createElement(
              View,
              { style: styles.toolsRow },
              ...course.tools_covered.map((tool, i) =>
                React.createElement(Text, { key: `tool-${i}`, style: styles.toolBadge }, tool),
              ),
            ),
          )
        : null,

      // Curriculum
      course.weeks && course.weeks.length > 0
        ? React.createElement(
            View,
            null,
            React.createElement(Text, { style: styles.sectionTitle }, s.curriculum),
            ...course.weeks
              .sort((a, b) => a.week_number - b.week_number)
              .map((week) => {
                const weekTitle = localized(week.title_en, week.title_jp, locale);
                return React.createElement(
                  View,
                  { key: `week-${week.id}`, wrap: false },

                  // Week header
                  React.createElement(
                    View,
                    { style: styles.weekHeader },
                    React.createElement(Text, { style: styles.weekNumber }, s.week(week.week_number)),
                    React.createElement(Text, { style: styles.weekTitle }, weekTitle),
                    week.phase
                      ? React.createElement(Text, { style: styles.weekPhase }, `(${week.phase})`)
                      : null,
                  ),

                  // Sessions
                  ...week.sessions
                    .sort((a, b) => a.session_number - b.session_number)
                    .map((session) => {
                      const sessionTitle = localized(session.title_en, session.title_jp, locale);
                      const topics = isJp && session.topics_jp?.length
                        ? session.topics_jp
                        : session.topics_en ?? [];

                      const metaParts = [
                        session.format,
                        session.duration_minutes ? s.duration(session.duration_minutes) : null,
                      ].filter(Boolean).join(' \u00B7 ');

                      return React.createElement(
                        View,
                        { key: `session-${session.id}`, style: styles.sessionBlock },
                        React.createElement(
                          View,
                          { style: styles.sessionHeader },
                          React.createElement(Text, { style: styles.sessionNumber }, s.session(session.session_number)),
                          React.createElement(Text, { style: styles.sessionTitle }, sessionTitle),
                        ),
                        metaParts
                          ? React.createElement(Text, { style: styles.sessionMeta }, metaParts)
                          : null,
                        ...topics.map((topic, ti) =>
                          React.createElement(
                            View,
                            { key: `topic-${ti}` },
                            React.createElement(Text, { style: styles.topicItem }, `\u2023 ${topic.title}`),
                            ...(topic.subtopics ?? []).map((sub, si) =>
                              React.createElement(Text, { key: `sub-${si}`, style: styles.subtopicItem }, `\u2013 ${sub}`),
                            ),
                          ),
                        ),
                      );
                    }),

                  // Assignments
                  ...week.assignments
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((assignment) => {
                      const aTitle = localized(assignment.title_en, assignment.title_jp, locale);
                      return React.createElement(
                        Text,
                        { key: `assign-${assignment.id}`, style: styles.assignmentItem },
                        `\u2610 ${s.assignment}: ${aTitle}`,
                      );
                    }),
                );
              }),
          )
        : null,

      // Footer
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.footerText }, s.footerOrg),
          React.createElement(Text, { style: styles.footerText }, s.footerCopyright(year)),
        ),
        React.createElement(
          View,
          { style: { alignItems: 'flex-end' as const } },
          React.createElement(Text, { style: styles.footerText }, s.footerWebsite),
          React.createElement(Text, { style: styles.footerText }, s.generatedOn(today)),
        ),
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

  const buffer = await renderToBuffer(doc);
  return Buffer.from(buffer);
}
