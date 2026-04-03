export type Locale = 'en' | 'ja';

export interface ContactEmailData {
  locale: Locale;
  name: string;
  email: string;
  subject: 'general' | 'consulting' | 'partnership' | 'feedback' | 'other';
  message: string;
}

export interface NewsletterAdminNotifyData {
  locale: Locale;
  email: string;
}

export interface ApplicationEmailData {
  locale: Locale;
  name: string;
  email: string;
  company: string | null;
  website: string | null;
  engagement: string | null;
  project: string;
  timeline: string | null;
  budget: string | null;
  referralSource: string | null;
}

export interface EnrollmentEmailData {
  locale: Locale;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  courseSlug: string;
  courseType: 'cohort' | 'self-study';
  startDate: string | null;
  amountPaid: number;
  currency: 'usd' | 'jpy';
  isManualEnroll: boolean;
}

export interface HonuHubContactEmailData {
  locale: Locale;
  name: string;
  email: string;
  type: 'group' | 'corporate' | 'partnership' | 'other';
  message: string;
}

export interface ExplorationInquiryEmailData {
  locale: Locale;
  name: string;
  email: string;
  company: string | null;
  message: string;
}

export interface ApplicationStatusEmailData {
  locale: Locale;
  applicantName: string;
  applicantEmail: string;
  newStatus: 'received' | 'reviewing' | 'responded' | 'archived';
  notes?: string;
}

export interface InstructorWelcomeEmailData {
  locale: Locale;
  displayName: string;
  email: string;
  titleEn: string | null;
  titleJp: string | null;
  actionLink: string;
  type: 'new' | 'promoted';
}

export interface StudentWelcomeEmailData {
  locale: Locale;
  fullName: string;
  email: string;
  actionLink: string;
  type: 'new' | 'existing';
  courseTitle?: string;
  surveyUrl?: string;
}

export interface VerticeLeadEmailData {
  locale: Locale;
  fullName: string;
  email: string;
  aiLevel: 'beginner' | 'intermediate' | 'advanced';
  interests: string[];
  whyStudy: string;
  isReturning: boolean;
}

export interface RecommendedTool {
  name: string;
  reason: string;
}

export interface SuggestedProject {
  title: string;
  description: string;
}

export interface StudentProfileEmailData {
  locale: Locale;
  fullName: string;
  email: string;
  levelLabel: string;
  levelDescription: string;
  recommendedTools: RecommendedTool[];  // exactly 3
  suggestedProjects: SuggestedProject[];  // exactly 3
  aiForYourWork: string;
  learningPath: string;
}
