// Admin-specific types

export type UserRole = 'student' | 'admin' | 'instructor';
export type SubscriptionTier = 'free' | 'premium';
export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'cancelled' | 'trialing';
export type ApplicationStatus = 'received' | 'reviewing' | 'responded' | 'archived';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  stripe_customer_id: string | null;
  subscription_tier: SubscriptionTier;
  subscription_stripe_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
  locale_preference: 'en' | 'ja';
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  name: string;
  email: string;
  company: string | null;
  website: string | null;
  engagement_type: string | null;
  project_description: string | null;
  desired_outcome: string | null;
  referral_source: string | null;
  timeline: string | null;
  budget_range: string | null;
  locale: string;
  status: ApplicationStatus;
  notes: string | null;
  submitted_at: string;
}

export interface DashboardStats {
  active_courses: number;
  total_enrolled: number;
  spots_remaining: { course_id: string; course_title: string; remaining: number }[];
  upcoming_sessions: {
    id: string;
    title_en: string;
    scheduled_at: string;
    course_title: string;
  }[];
  recent_enrollments: {
    id: string;
    user_name: string;
    course_title: string;
    enrolled_at: string;
  }[];
  pending_applications: number;
}

export interface StudentListItem {
  id: string;
  email: string | null;
  full_name: string | null;
  enrolled_courses: string[];
  created_at: string;
}

export interface StudentDetail extends UserProfile {
  enrollments: {
    id: string;
    course_id: string;
    course_title: string;
    status: string;
    amount_paid: number | null;
    currency: string;
    enrolled_at: string;
  }[];
}
