import type { Course } from './types';

export type CatalogFilter =
  | 'all'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'builder-track';

export const CATALOG_FILTERS: readonly CatalogFilter[] = [
  'all',
  'beginner',
  'intermediate',
  'advanced',
  'builder-track',
] as const;

const BUILDER_TRACK_TAG = 'builder-track';

export function isBuilderTrack(course: Course): boolean {
  return course.tags?.includes(BUILDER_TRACK_TAG) ?? false;
}

export function filterCatalog(
  courses: Course[],
  filter: CatalogFilter,
): Course[] {
  if (filter === 'all') return courses;
  if (filter === 'builder-track') return courses.filter(isBuilderTrack);
  return courses.filter((c) => c.level === filter);
}
