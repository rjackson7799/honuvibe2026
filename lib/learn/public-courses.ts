import { unstable_cache } from 'next/cache';
import { createClient as createAnonClient } from '@supabase/supabase-js';
import type { TrackId } from '@/lib/tracks';
import type { Course } from '@/lib/courses/types';

/** Cache tag for the public course list on /learn. */
export const COURSE_CATALOG_TAG = 'course-catalog';

/**
 * Browse-safe shape of a public course. Anon can no longer read raw `courses`
 * (5e0e141); this reads the `course_catalog` view with an explicit column
 * list so no link, staff or proposal column can ever reach the page.
 */
export type PublicCourse = Pick<
  Course,
  | 'id'
  | 'slug'
  | 'title_en'
  | 'title_jp'
  | 'description_en'
  | 'description_jp'
  | 'level'
  | 'language'
  | 'total_weeks'
  | 'thumbnail_url'
  | 'price_usd'
  | 'price_jpy'
  | 'is_featured'
  | 'created_at'
> & { track: TrackId | null; vault_included: boolean };

export const PUBLIC_COURSE_COLUMNS =
  'id, slug, title_en, title_jp, description_en, description_jp, level, language, ' +
  'total_weeks, thumbnail_url, price_usd, price_jpy, is_featured, created_at, ' +
  'track, vault_included';

/**
 * Published, non-private courses for the Learn catalog, newest first.
 * Cookie-less anon client so the result is cacheable and the page prerenders.
 */
export const getPublicCourseCatalog = unstable_cache(
  async (): Promise<PublicCourse[]> => {
    try {
      const supabase = createAnonClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } },
      );
      const { data, error } = await supabase
        .from('course_catalog')
        .select(PUBLIC_COURSE_COLUMNS)
        .eq('is_published', true)
        .eq('is_private', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('getPublicCourseCatalog error:', error);
        return [];
      }
      return (data ?? []) as unknown as PublicCourse[];
    } catch (error) {
      console.error('getPublicCourseCatalog error:', error);
      return [];
    }
  },
  ['learn-public-courses'],
  { revalidate: 600, tags: [COURSE_CATALOG_TAG] },
);
