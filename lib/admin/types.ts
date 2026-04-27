// Admin-specific types

export type UserRole = 'student' | 'admin' | 'instructor';
export type SubscriptionTier = 'free' | 'premium';
export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'cancelled' | 'trialing';
export type ApplicationStatus = 'received' | 'reviewing' | 'responded' | 'archived';
export type PartnershipInquiryStatus = ApplicationStatus;

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

export interface PartnershipInquiry {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  organization: string;
  website: string | null;
  org_type: string;
  community_description: string;
  program_description: string;
  audience_size: string | null;
  language: string | null;
  timeline: string | null;
  referral_source: string | null;
  source_locale: 'en' | 'ja';
  status: PartnershipInquiryStatus;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
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
  subscription_status: string;
  subscription_tier: string;
  survey_status: 'pending' | 'completed' | null;
  created_at: string;
}

export interface RevenueStats {
  total_usd: number;
  total_jpy: number;
  month_usd: number;
  month_jpy: number;
  active_subscribers: number;
  active_enrollments: number;
}

export interface TransactionRecord {
  id: string;
  user_name: string | null;
  user_email: string | null;
  type: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  receipt_url: string | null;
  created_at: string;
}

export interface StudentDetail extends UserProfile {
  email_confirmed_at: string | null;
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
