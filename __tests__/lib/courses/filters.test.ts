import { describe, it, expect } from 'vitest';
import { filterCatalog, isBuilderTrack } from '@/lib/courses/filters';
import type { Course, CourseLevel } from '@/lib/courses/types';

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: 'c-1',
    slug: 'sample',
    course_id_code: null,
    course_type: 'cohort',
    title_en: 'Sample',
    title_jp: null,
    description_en: null,
    description_jp: null,
    instructor_name: null,
    instructor_id: null,
    price_usd: null,
    price_jpy: null,
    instructor_revenue_share_pct: null,
    language: 'en',
    subtitle_language: null,
    level: null,
    format: null,
    start_date: null,
    end_date: null,
    total_weeks: null,
    live_sessions_count: null,
    recorded_lessons_count: null,
    max_enrollment: null,
    current_enrollment: 0,
    learning_outcomes_en: null,
    learning_outcomes_jp: null,
    prerequisites_en: null,
    prerequisites_jp: null,
    who_is_for_en: null,
    who_is_for_jp: null,
    tools_covered: null,
    community_platform: null,
    community_duration_months: null,
    community_link: null,
    zoom_link: null,
    schedule_notes_en: null,
    schedule_notes_jp: null,
    cancellation_policy_en: null,
    cancellation_policy_jp: null,
    completion_requirements_en: null,
    completion_requirements_jp: null,
    materials_summary_en: null,
    materials_summary_jp: null,
    thumbnail_url: null,
    hero_image_url: null,
    tags: null,
    is_featured: false,
    is_published: true,
    is_private: false,
    status: 'published',
    esl_enabled: false,
    esl_included: false,
    esl_price_usd: null,
    esl_price_jpy: null,
    esl_settings_json: null,
    free_preview_count: 0,
    syllabus_url_en: null,
    syllabus_url_jp: null,
    proposed_by_instructor_id: null,
    proposal_submitted_at: null,
    proposal_review_notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const beginner = makeCourse({ id: 'b', level: 'beginner' as CourseLevel });
const intermediate = makeCourse({ id: 'i', level: 'intermediate' as CourseLevel });
const advanced = makeCourse({ id: 'a', level: 'advanced' as CourseLevel });
const trackBeginner = makeCourse({
  id: 't',
  level: 'beginner' as CourseLevel,
  tags: ['builder-track'],
});
const trackAdvanced = makeCourse({
  id: 't2',
  level: 'advanced' as CourseLevel,
  tags: ['something-else', 'builder-track'],
});

const all = [beginner, intermediate, advanced, trackBeginner, trackAdvanced];

describe('isBuilderTrack', () => {
  it('returns false when tags is null', () => {
    expect(isBuilderTrack(makeCourse({ tags: null }))).toBe(false);
  });

  it('returns false when tags array does not include the marker', () => {
    expect(isBuilderTrack(makeCourse({ tags: ['foo', 'bar'] }))).toBe(false);
  });

  it('returns true when tags array includes builder-track', () => {
    expect(isBuilderTrack(makeCourse({ tags: ['builder-track'] }))).toBe(true);
  });

  it('returns true regardless of position in the tag array', () => {
    expect(isBuilderTrack(makeCourse({ tags: ['x', 'builder-track', 'y'] }))).toBe(true);
  });
});

describe('filterCatalog', () => {
  it('returns the full list for "all"', () => {
    expect(filterCatalog(all, 'all')).toHaveLength(5);
  });

  it('narrows by level', () => {
    expect(filterCatalog(all, 'beginner').map((c) => c.id)).toEqual(['b', 't']);
    expect(filterCatalog(all, 'intermediate').map((c) => c.id)).toEqual(['i']);
    expect(filterCatalog(all, 'advanced').map((c) => c.id)).toEqual(['a', 't2']);
  });

  it('narrows by builder-track tag (independent of level)', () => {
    expect(filterCatalog(all, 'builder-track').map((c) => c.id)).toEqual(['t', 't2']);
  });

  it('returns empty array when no courses match', () => {
    expect(filterCatalog([beginner, intermediate], 'builder-track')).toEqual([]);
    expect(filterCatalog([trackBeginner], 'advanced')).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [...all];
    filterCatalog(input, 'beginner');
    expect(input).toEqual(all);
  });
});
