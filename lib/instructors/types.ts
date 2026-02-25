// Instructor-related TypeScript types
// Mirrors Supabase schema from supabase/migrations/004_instructor_management.sql

export interface InstructorProfile {
  id: string;
  user_id: string;
  display_name: string;
  title_en: string | null;
  title_jp: string | null;
  bio_short_en: string | null;
  bio_short_jp: string | null;
  bio_long_en: string | null;
  bio_long_jp: string | null;
  photo_url: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Joined type for admin pages — includes the linked user's info
export interface InstructorWithUser extends InstructorProfile {
  user: {
    email: string | null;
    full_name: string | null;
  };
}

// Public-facing subset for course pages
export interface InstructorCardData {
  display_name: string;
  title_en: string | null;
  title_jp: string | null;
  bio_short_en: string | null;
  bio_short_jp: string | null;
  bio_long_en: string | null;
  bio_long_jp: string | null;
  photo_url: string | null;
  website_url: string | null;
}

// Admin list row with aggregated course count
export interface InstructorListItem {
  id: string;
  user_id: string;
  display_name: string;
  title_en: string | null;
  photo_url: string | null;
  is_active: boolean;
  email: string | null;
  course_count: number;
}

// Input types for create/update actions
export interface InstructorProfileCreateInput {
  display_name: string;
  title_en?: string | null;
  title_jp?: string | null;
  bio_short_en?: string | null;
  bio_short_jp?: string | null;
  bio_long_en?: string | null;
  bio_long_jp?: string | null;
  website_url?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
}

export interface InstructorProfileUpdateInput extends Partial<InstructorProfileCreateInput> {
  is_active?: boolean;
}
