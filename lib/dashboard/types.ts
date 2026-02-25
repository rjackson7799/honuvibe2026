// Student dashboard types

import type { EnrollmentWithCourse } from '@/lib/enrollments/types';
import type {
  SessionFormat,
  SessionStatus,
  AssignmentType,
  ResourceType,
} from '@/lib/courses/types';

export interface StudentStats {
  active_courses: number;
  completed_courses: number;
  upcoming_sessions_count: number;
  total_study_hours: number;
}

export interface UpcomingSessionItem {
  id: string;
  title_en: string;
  title_jp: string | null;
  format: SessionFormat;
  scheduled_at: string;
  zoom_link: string | null;
  replay_url: string | null;
  duration_minutes: number | null;
  status: SessionStatus;
  course_title_en: string;
  course_title_jp: string | null;
  course_slug: string;
  week_number: number;
}

export interface PendingAssignmentItem {
  id: string;
  title_en: string;
  title_jp: string | null;
  description_en: string;
  description_jp: string | null;
  assignment_type: AssignmentType;
  due_date: string | null;
  week_number: number;
  course_title_en: string;
  course_title_jp: string | null;
  course_slug: string;
}

export interface StudentDashboardData {
  enrollments: EnrollmentWithCourse[];
  upcomingSessions: UpcomingSessionItem[];
  pendingAssignments: PendingAssignmentItem[];
  stats: StudentStats;
}

export interface CommunityLink {
  course_id: string;
  course_title_en: string;
  course_title_jp: string | null;
  course_slug: string;
  community_platform: string | null;
  community_link: string | null;
  community_duration_months: number | null;
  zoom_link: string | null;
  thumbnail_url: string | null;
}

export interface ContentItemForStudent {
  id: string;
  title_en: string;
  title_jp: string | null;
  description_en: string | null;
  description_jp: string | null;
  content_type: string;
  url: string;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  difficulty_level: string;
  language: string;
  tags: string[];
  access_tier: 'free' | 'premium';
  source: string | null;
}

export interface ContentCollectionForStudent {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string | null;
  description_en: string | null;
  description_jp: string | null;
  items: ContentItemForStudent[];
}
