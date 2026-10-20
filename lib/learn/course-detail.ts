// Course detail view model (Unit 2b). Turns a CourseWithCurriculum into a
// whitelisted, locale-resolved shape for the marketing course page. Paid
// fields (zoom/community links, session replay/materials/slides/transcripts,
// resource urls, ESL settings, revenue shares, proposal fields) are never
// copied, so they cannot reach a component prop. Pure: no React, no I/O.
import type {
  CourseWithCurriculum,
  CourseLevel,
  CourseLanguage,
  CourseType,
  CourseSession,
  CourseWeekWithContent,
} from '@/lib/courses/types';
import { getFreeSessionIds } from '@/lib/courses/utils';

export type CourseFormatKind = 'live_cohort' | 'self_paced' | 'one_on_one';

export type CourseLessonView = {
  id: string;
  code: string;
  title: string;
  points: string[];
  freePreview: boolean;
};

export type CourseModuleView = {
  id: string;
  number: number;
  stage: string | null;
  title: string;
  lessonCount: number;
  minutes: number | null;
  lessons: CourseLessonView[];
  task: string | null;
};

export type CourseInstructorView = {
  name: string;
  role: 'lead' | 'instructor' | 'guest' | null;
  title: string | null;
  bio: string | null;
  photoUrl: string | null;
};

export type CourseFact =
  | { key: 'format'; value: CourseFormatKind }
  | { key: 'length'; modules: number; hours: number | null; weeks: number | null }
  | { key: 'language'; value: CourseLanguage }
  | { key: 'starts'; date: string }
  | { key: 'community'; months: number };

export type CourseDetailView = {
  id: string;
  slug: string;
  code: string | null;
  title: string;
  altTitle: string | null;
  description: string | null;
  level: CourseLevel | null;
  formatKind: CourseFormatKind;
  language: CourseLanguage;
  courseType: CourseType;
  imageUrl: string | null;
  partnerName: string | null;
  isPrivate: boolean;
  vaultIncluded: boolean;
  priceUsd: number | null;
  priceJpy: number | null;
  startDate: string | null;
  totalWeeks: number | null;
  spotsLeft: number | null;
  facts: CourseFact[];
  audience: string[];
  prerequisites: string | null;
  tools: string[];
  outcomes: string[];
  modules: CourseModuleView[];
  instructors: CourseInstructorView[];
  syllabusLocales: ('en' | 'ja')[];
  cancellationPolicy: string | null;
};

type Locale = 'en' | 'ja';

/** JP value when on /ja and non-empty, else EN. */
function pick(locale: Locale, en: string | null, jp: string | null): string | null {
  if (locale === 'ja' && jp) return jp;
  return en || null;
}

function pickList<T>(locale: Locale, en: T[] | null, jp: T[] | null): T[] {
  if (locale === 'ja' && jp && jp.length > 0) return jp;
  return en ?? [];
}

/**
 * Mirrors PriceDisplay and checkout-embed: JA uses JPY only when it is
 * truthy, otherwise USD (cents); null when the locale has no usable price.
 */
export function formatCoursePrice(
  priceUsd: number | null,
  priceJpy: number | null,
  locale: Locale,
): string | null {
  if (locale === 'ja' && priceJpy) return `¥${priceJpy.toLocaleString('ja-JP')}`;
  if (priceUsd) return `$${(priceUsd / 100).toLocaleString('en-US')}`;
  return null;
}

/** "Dec 1, 2026" / "2026年12月1日". UTC so a date-only start_date never shifts a day. */
export function formatCourseDate(date: string, locale: Locale): string {
  return new Date(date).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: locale === 'ja' ? 'long' : 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatKindOf(course: CourseWithCurriculum): CourseFormatKind {
  if (course.course_type === '1v1') return 'one_on_one';
  if ((course.live_sessions_count ?? 0) > 0) return 'live_cohort';
  return 'self_paced';
}

function lessonsOf(week: CourseWeekWithContent): CourseSession[] {
  return week.sessions
    .filter((s) => !s.is_bonus)
    .sort((a, b) => (a.session_number ?? Infinity) - (b.session_number ?? Infinity));
}

function buildModules(
  course: CourseWithCurriculum,
  locale: Locale,
): CourseModuleView[] {
  const freeIds = getFreeSessionIds(course.free_preview_count, course.weeks);
  return [...course.weeks]
    .sort((a, b) => a.week_number - b.week_number)
    .map((week) => {
      const sessions = lessonsOf(week);
      const lessons: CourseLessonView[] = sessions.map((s, i) => ({
        id: s.id,
        code: `${week.week_number}.${s.session_number ?? i + 1}`,
        title: pick(locale, s.title_en, s.title_jp) ?? '',
        points: pickList(locale, s.topics_en, s.topics_jp).map((t) => t.title),
        freePreview: freeIds.has(s.id),
      }));
      const durations = sessions.map((s) => s.duration_minutes);
      const minutes =
        durations.length > 0 && durations.every((d) => d != null)
          ? durations.reduce<number>((sum, d) => sum + (d ?? 0), 0)
          : null;
      const firstTask = [...week.assignments].sort((a, b) => a.sort_order - b.sort_order)[0];
      return {
        id: week.id,
        number: week.week_number,
        stage: week.phase || null,
        title: pick(locale, week.title_en, week.title_jp) ?? '',
        lessonCount: lessons.length,
        minutes,
        lessons,
        task: firstTask ? pick(locale, firstTask.title_en, firstTask.title_jp) : null,
      };
    });
}

function buildInstructors(
  course: CourseWithCurriculum,
  locale: Locale,
): CourseInstructorView[] {
  const list = course.instructors ?? [];
  if (list.length > 0) {
    return list.map((ci) => ({
      name: ci.instructor.display_name,
      role: ci.role,
      title: pick(locale, ci.instructor.title_en, ci.instructor.title_jp),
      bio: pick(locale, ci.instructor.bio_short_en, ci.instructor.bio_short_jp),
      photoUrl: ci.instructor.photo_url,
    }));
  }
  if (course.instructor) {
    const i = course.instructor;
    return [
      {
        name: i.display_name,
        role: null,
        title: pick(locale, i.title_en, i.title_jp),
        bio: pick(locale, i.bio_short_en, i.bio_short_jp),
        photoUrl: i.photo_url,
      },
    ];
  }
  if (course.instructor_name) {
    return [{ name: course.instructor_name, role: null, title: null, bio: null, photoUrl: null }];
  }
  return [];
}

function buildFacts(
  course: CourseWithCurriculum,
  modules: CourseModuleView[],
  formatKind: CourseFormatKind,
  now: Date,
): CourseFact[] {
  const facts: CourseFact[] = [{ key: 'format', value: formatKind }];

  if (modules.length > 0) {
    const allTimed = modules.every((m) => m.minutes != null) && modules.some((m) => m.lessonCount > 0);
    const totalMinutes = modules.reduce((sum, m) => sum + (m.minutes ?? 0), 0);
    facts.push({
      key: 'length',
      modules: modules.length,
      hours: allTimed && totalMinutes > 0 ? Math.max(1, Math.round(totalMinutes / 60)) : null,
      weeks: course.total_weeks || null,
    });
  }

  facts.push({ key: 'language', value: course.language });

  if (
    course.course_type === 'cohort' &&
    course.start_date &&
    new Date(course.start_date) > now
  ) {
    facts.push({ key: 'starts', date: course.start_date });
  } else if (course.community_duration_months) {
    facts.push({ key: 'community', months: course.community_duration_months });
  }

  return facts;
}

export function buildCourseDetailView(
  course: CourseWithCurriculum,
  locale: Locale,
  now: Date,
): CourseDetailView {
  const title = pick(locale, course.title_en, course.title_jp) ?? course.title_en;
  const other = locale === 'ja' ? course.title_en : course.title_jp;
  const altTitle = other && other !== title ? other : null;

  const formatKind = formatKindOf(course);
  const modules = buildModules(course, locale);

  const syllabusLocales: ('en' | 'ja')[] =
    course.course_type === '1v1' || modules.length === 0
      ? []
      : course.language === 'en'
        ? ['en']
        : ['en', 'ja'];

  const spotsLeft =
    course.max_enrollment != null
      ? Math.max(0, course.max_enrollment - course.current_enrollment)
      : null;

  const partnerName = course.partners
    ? pick(locale, course.partners.name_en, course.partners.name_jp)
    : null;

  return {
    id: course.id,
    slug: course.slug,
    code: course.course_id_code || null,
    title,
    altTitle,
    description: pick(locale, course.description_en, course.description_jp),
    level: course.level,
    formatKind,
    language: course.language,
    courseType: course.course_type,
    imageUrl: course.hero_image_url || course.thumbnail_url || null,
    partnerName,
    isPrivate: course.is_private === true,
    vaultIncluded: course.vault_included === true,
    priceUsd: course.price_usd,
    priceJpy: course.price_jpy,
    startDate: course.start_date,
    totalWeeks: course.total_weeks || null,
    spotsLeft,
    facts: buildFacts(course, modules, formatKind, now),
    audience: pickList(locale, course.who_is_for_en, course.who_is_for_jp),
    prerequisites: pick(locale, course.prerequisites_en, course.prerequisites_jp),
    tools: course.tools_covered ?? [],
    outcomes: pickList(locale, course.learning_outcomes_en, course.learning_outcomes_jp),
    modules,
    instructors: buildInstructors(course, locale),
    syllabusLocales,
    cancellationPolicy: pick(locale, course.cancellation_policy_en, course.cancellation_policy_jp),
  };
}
