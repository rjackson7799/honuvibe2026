// Course-related TypeScript types
// Mirrors Supabase schema from supabase/migrations/001_phase2_schema.sql

export type CourseType = 'cohort' | 'self-study';
export type CourseStatus = 'draft' | 'published' | 'in-progress' | 'completed' | 'archived';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseLanguage = 'en' | 'ja' | 'both';
export type SessionFormat = 'live' | 'recorded' | 'hybrid';
export type SessionStatus = 'upcoming' | 'live' | 'completed';
export type AssignmentType = 'homework' | 'action-challenge' | 'project';
export type ResourceType = 'article' | 'video' | 'tool' | 'template' | 'download' | 'guide';

export interface SessionTopic {
  title: string;
  subtopics: string[];
}

export interface MaterialSummaryItem {
  material: string;
  language: string;
  provided_with: string;
}

export interface Course {
  id: string;
  slug: string;
  course_id_code: string | null;
  course_type: CourseType;
  title_en: string;
  title_jp: string | null;
  description_en: string | null;
  description_jp: string | null;
  instructor_name: string | null;
  price_usd: number | null;
  price_jpy: number | null;
  language: CourseLanguage;
  subtitle_language: string | null;
  level: CourseLevel | null;
  format: string | null;
  start_date: string | null;
  end_date: string | null;
  total_weeks: number | null;
  live_sessions_count: number | null;
  recorded_lessons_count: number | null;
  max_enrollment: number | null;
  current_enrollment: number;
  learning_outcomes_en: string[] | null;
  learning_outcomes_jp: string[] | null;
  prerequisites_en: string | null;
  prerequisites_jp: string | null;
  who_is_for_en: string[] | null;
  who_is_for_jp: string[] | null;
  tools_covered: string[] | null;
  community_platform: string | null;
  community_duration_months: number | null;
  community_link: string | null;
  zoom_link: string | null;
  schedule_notes_en: string | null;
  schedule_notes_jp: string | null;
  cancellation_policy_en: string | null;
  cancellation_policy_jp: string | null;
  completion_requirements_en: string[] | null;
  completion_requirements_jp: string[] | null;
  materials_summary_en: MaterialSummaryItem[] | null;
  materials_summary_jp: MaterialSummaryItem[] | null;
  thumbnail_url: string | null;
  hero_image_url: string | null;
  tags: string[] | null;
  is_published: boolean;
  status: CourseStatus;
  created_at: string;
  updated_at: string;
}

export interface CourseWeek {
  id: string;
  course_id: string;
  week_number: number;
  title_en: string;
  title_jp: string | null;
  subtitle_en: string | null;
  subtitle_jp: string | null;
  description_en: string | null;
  description_jp: string | null;
  phase: string | null;
  unlock_date: string | null;
  is_unlocked: boolean;
  created_at: string;
}

export interface CourseSession {
  id: string;
  week_id: string;
  session_number: number;
  title_en: string;
  title_jp: string | null;
  format: SessionFormat;
  duration_minutes: number | null;
  scheduled_at: string | null;
  materials_en: string[] | null;
  materials_jp: string[] | null;
  topics_en: SessionTopic[] | null;
  topics_jp: SessionTopic[] | null;
  zoom_link: string | null;
  replay_url: string | null;
  transcript_url: string | null;
  slide_deck_url: string | null;
  status: SessionStatus;
  created_at: string;
}

export interface CourseAssignment {
  id: string;
  week_id: string;
  sort_order: number;
  title_en: string;
  title_jp: string | null;
  description_en: string;
  description_jp: string | null;
  assignment_type: AssignmentType;
  due_date: string | null;
  created_at: string;
}

export interface CourseVocabulary {
  id: string;
  week_id: string;
  sort_order: number;
  term_en: string;
  term_jp: string;
  created_at: string;
}

export interface CourseResource {
  id: string;
  week_id: string | null;
  session_id: string | null;
  content_item_id: string | null;
  sort_order: number;
  title_en: string;
  title_jp: string | null;
  url: string | null;
  resource_type: ResourceType | null;
  description_en: string | null;
  description_jp: string | null;
  is_public: boolean;
  created_at: string;
}

// Joined types for data fetching
export interface CourseWeekWithContent extends CourseWeek {
  sessions: CourseSession[];
  assignments: CourseAssignment[];
  vocabulary: CourseVocabulary[];
  resources: CourseResource[];
}

export interface CourseWithCurriculum extends Course {
  weeks: CourseWeekWithContent[];
}

// Wizard types
export type ContentDifficulty = 'introductory' | 'foundational' | 'intermediate' | 'advanced' | 'expert';

export interface WizardParams {
  title: string;
  description: string;
  instructorName: string;
  courseType: CourseType;
  level: CourseLevel;
  format: SessionFormat;
  studentLanguage: CourseLanguage;
  contentDifficulty: ContentDifficulty;
  totalWeeks: number;
  priceUsd: number;
  priceJpy: number;
  maxEnrollment?: number;
  startDate?: string;
  topicOverview: string;
  learningOutcomes: string[];
  toolsToCover: string[];
  targetAudience: string;
  prerequisites?: string;
  specialInstructions?: string;
  templateId?: string;
}

// Upload pipeline types
export interface CourseUpload {
  id: string;
  admin_user_id: string | null;
  filename: string | null;
  raw_markdown: string;
  parsed_json: ParsedCourseData | null;
  course_id: string | null;
  status: 'parsing' | 'parsed' | 'confirmed' | 'failed';
  error_message: string | null;
  uploaded_at: string;
}

export interface ParsedSessionData {
  session_number: number;
  title_en: string;
  title_jp: string | null;
  format: SessionFormat;
  duration_minutes: number | null;
  materials_en: string[] | null;
  materials_jp: string[] | null;
  topics_en: SessionTopic[] | null;
  topics_jp: SessionTopic[] | null;
}

export interface ParsedAssignmentData {
  title_en: string;
  title_jp: string | null;
  description_en: string;
  description_jp: string | null;
  assignment_type: AssignmentType;
}

export interface ParsedVocabularyData {
  term_en: string;
  term_jp: string;
}

export interface ParsedResourceData {
  title_en: string;
  url: string | null;
  resource_type: ResourceType | null;
  description_en: string | null;
}

export interface ParsedWeekData {
  week_number: number;
  title_en: string;
  title_jp: string | null;
  subtitle_en: string | null;
  subtitle_jp: string | null;
  description_en: string | null;
  phase: string | null;
  sessions: ParsedSessionData[];
  assignments: ParsedAssignmentData[];
  vocabulary: ParsedVocabularyData[];
  resources: ParsedResourceData[];
}

export interface ParsedCourseData {
  course: {
    course_id_code: string;
    slug: string;
    title_en: string;
    title_jp: string | null;
    description_en: string;
    description_jp: string | null;
    instructor_name: string;
    price_usd: number;
    price_jpy: number;
    language: CourseLanguage;
    subtitle_language: string | null;
    level: CourseLevel;
    format: string;
    start_date: string | null;
    total_weeks: number;
    live_sessions_count: number;
    recorded_lessons_count: number;
    max_enrollment: number;
    learning_outcomes_en: string[];
    learning_outcomes_jp: string[] | null;
    prerequisites_en: string;
    prerequisites_jp: string | null;
    who_is_for_en: string[];
    who_is_for_jp: string[] | null;
    tools_covered: string[];
    community_platform: string;
    community_duration_months: number;
    schedule_notes_en: string;
    schedule_notes_jp: string | null;
    cancellation_policy_en: string;
    cancellation_policy_jp: string | null;
    completion_requirements_en: string[];
    completion_requirements_jp: string[] | null;
    materials_summary: MaterialSummaryItem[];
    tags: string[];
  };
  weeks: ParsedWeekData[];
}
