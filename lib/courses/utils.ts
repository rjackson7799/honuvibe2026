import type { CourseSession, CourseWeekWithContent } from './types';

/**
 * Determines if a session is free based on the course's free_preview_count.
 * Sessions are ordered by week_number ASC, session_number ASC.
 * Bonus sessions are never free.
 */
export function isSessionFree(
  sessionId: string,
  freePreviewCount: number,
  weeks: CourseWeekWithContent[],
): boolean {
  if (freePreviewCount <= 0) return false;

  // Flatten all non-bonus curriculum sessions in order
  const orderedSessions: CourseSession[] = [];
  const sortedWeeks = [...weeks].sort((a, b) => a.week_number - b.week_number);

  for (const week of sortedWeeks) {
    const sortedSessions = [...week.sessions]
      .filter((s) => !s.is_bonus)
      .sort((a, b) => (a.session_number ?? 0) - (b.session_number ?? 0));
    orderedSessions.push(...sortedSessions);
  }

  const index = orderedSessions.findIndex((s) => s.id === sessionId);
  return index >= 0 && index < freePreviewCount;
}

/**
 * Returns a Set of session IDs that are free for the given course.
 */
export function getFreeSessionIds(
  freePreviewCount: number,
  weeks: CourseWeekWithContent[],
): Set<string> {
  if (freePreviewCount <= 0) return new Set();

  const orderedSessions: CourseSession[] = [];
  const sortedWeeks = [...weeks].sort((a, b) => a.week_number - b.week_number);

  for (const week of sortedWeeks) {
    const sortedSessions = [...week.sessions]
      .filter((s) => !s.is_bonus)
      .sort((a, b) => (a.session_number ?? 0) - (b.session_number ?? 0));
    orderedSessions.push(...sortedSessions);
  }

  const freeIds = new Set<string>();
  for (let i = 0; i < Math.min(freePreviewCount, orderedSessions.length); i++) {
    freeIds.add(orderedSessions[i].id);
  }
  return freeIds;
}
