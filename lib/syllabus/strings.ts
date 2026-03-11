type SyllabusStrings = {
  courseSyllabus: string;
  overview: string;
  prerequisites: string;
  learningOutcomes: string;
  toolsAndTechnologies: string;
  curriculum: string;
  week: (n: number) => string;
  session: (n: number) => string;
  assignment: string;
  assignments: string;
  duration: (min: number) => string;
  format: string;
  level: string;
  instructor: string;
  startDate: string;
  weeks: (n: number) => string;
  liveSessions: (n: number) => string;
  topics: string;
  footerOrg: string;
  footerCopyright: (year: number) => string;
  footerWebsite: string;
  generatedOn: (date: string) => string;
};

const en: SyllabusStrings = {
  courseSyllabus: 'Course Syllabus',
  overview: 'Overview',
  prerequisites: 'Prerequisites',
  learningOutcomes: 'Learning Outcomes',
  toolsAndTechnologies: 'Tools & Technologies',
  curriculum: 'Curriculum',
  week: (n) => `Week ${n}`,
  session: (n) => `Session ${n}`,
  assignment: 'Assignment',
  assignments: 'Assignments',
  duration: (min) => `${min} min`,
  format: 'Format',
  level: 'Level',
  instructor: 'Instructor',
  startDate: 'Start Date',
  weeks: (n) => `${n} weeks`,
  liveSessions: (n) => `${n} live sessions`,
  topics: 'Topics',
  footerOrg: 'HonuVibe.AI | Honolulu, Hawaii',
  footerCopyright: (year) => `\u00A9 ${year} HonuVibe.AI. All rights reserved.`,
  footerWebsite: 'honuvibe.ai',
  generatedOn: (date) => `Generated on ${date}`,
};

const ja: SyllabusStrings = {
  courseSyllabus: '\u30B3\u30FC\u30B9\u30B7\u30E9\u30D0\u30B9',
  overview: '\u6982\u8981',
  prerequisites: '\u524D\u63D0\u6761\u4EF6',
  learningOutcomes: '\u5B66\u7FD2\u6210\u679C',
  toolsAndTechnologies: '\u30C4\u30FC\u30EB\uFF06\u30C6\u30AF\u30CE\u30ED\u30B8\u30FC',
  curriculum: '\u30AB\u30EA\u30AD\u30E5\u30E9\u30E0',
  week: (n) => `\u7B2C${n}\u9031`,
  session: (n) => `\u30BB\u30C3\u30B7\u30E7\u30F3${n}`,
  assignment: '\u8AB2\u984C',
  assignments: '\u8AB2\u984C',
  duration: (min) => `${min}\u5206`,
  format: '\u5F62\u5F0F',
  level: '\u30EC\u30D9\u30EB',
  instructor: '\u8B1B\u5E2B',
  startDate: '\u958B\u59CB\u65E5',
  weeks: (n) => `${n}\u9031\u9593`,
  liveSessions: (n) => `\u30E9\u30A4\u30D6\u30BB\u30C3\u30B7\u30E7\u30F3${n}\u56DE`,
  topics: '\u30C8\u30D4\u30C3\u30AF',
  footerOrg: 'HonuVibe.AI | \u30DB\u30CE\u30EB\u30EB\u3001\u30CF\u30EF\u30A4',
  footerCopyright: (year) => `\u00A9 ${year} HonuVibe.AI. All rights reserved.`,
  footerWebsite: 'honuvibe.ai',
  generatedOn: (date) => `${date}\u306B\u751F\u6210`,
};

export function getSyllabusStrings(locale: string): SyllabusStrings {
  return locale === 'ja' ? ja : en;
}
