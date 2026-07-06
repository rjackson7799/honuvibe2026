export type Locale = 'en' | 'ja';

export interface ContactEmailData {
  locale: Locale;
  name: string;
  email: string;
  subject: 'general' | 'course' | 'partnership' | 'media' | 'other';
  message: string;
}

export interface NewsletterAdminNotifyData {
  locale: Locale;
  email: string;
  /** Optional signup origin, e.g. "event:ai-prompting-jumpstart". */
  source?: string;
}

/** "Confirm your seat" email sent on submit — the double-opt-in step. */
export interface EventConfirmRequestData {
  locale: Locale;
  email: string;
  fullName: string;
  eventTitle: string;
  eventWhen: string;
  eventFormat: string;
  /** Tokenized /events/[slug]/confirm?token=… URL. */
  confirmUrl: string;
}

/** "You're in" email sent AFTER a seat is confirmed — carries the join link + .ics. */
export interface EventRsvpConfirmationData {
  locale: Locale;
  email: string;
  fullName: string;
  eventSlug: string;
  eventTitle: string;
  /** Pre-formatted date/time string in the recipient's locale. */
  eventWhen: string;
  /** e.g. "Live on Zoom". */
  eventFormat: string;
  /** Public /events/[slug] page URL — also the .ics destination. */
  eventPageUrl: string;
  /** Join URL (e.g. Zoom) — shown only post-confirmation. */
  meetingUrl: string | null;
  /** ISO start/end instants — used to build the .ics calendar attachment. */
  startsAt: string;
  endsAt: string | null;
  eventDescription?: string;
  /** Tokenized pre-event survey URL — appended as a CTA when present. */
  surveyUrl?: string;
}

export interface EventRsvpAdminNotifyData {
  locale: Locale;
  email: string;
  fullName: string;
  eventSlug: string;
  eventTitle: string;
  referralSource: string | null;
  seatsRemaining: number;
}

/** Per-student invite to a course's pre-course survey (tokenized link). */
export interface CourseSurveyInviteData {
  locale: Locale;
  email: string;
  fullName: string;
  courseTitle: string;
  surveyUrl: string;
}

/** Pre-course survey summary mailed to the instructor(s) (To), BCC'd to admins. */
export interface CourseSummaryEmailData {
  to: string[];
  bcc: string[];
  locale: Locale;
  courseTitle: string;
  responseCount: number;
  summaryText: string;
  keyTakeaways: string[];
  teachingFocus: string;
  instructorNotes: string;
  topStats?: { prompt: string; rows: { label: string; value: string }[] }[];
  adminUrl: string;
}

/** Pre-event survey summary mailed to the presenter (To), BCC'd to admins. */
export interface PresenterSummaryEmailData {
  to: string;
  bcc: string[];
  locale: Locale;
  eventTitle: string;
  eventWhen: string;
  eventFormat: string;
  responseCount: number;
  summaryText: string;
  keyTakeaways: string[];
  focusTopics: string;
  presenterPrepNotes: string;
  /** Optional per-question top stats (single/multi only). */
  topStats?: { prompt: string; rows: { label: string; value: string }[] }[];
  eventAdminUrl: string;
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

export interface PartnershipInquiryEmailData {
  locale: Locale;
  fullName: string;
  email: string;
  organization: string;
  website: string | null;
  orgTypeLabel: string;
  communityDescription: string;
  programDescription: string;
  audienceSizeLabel: string | null;
  languageLabel: string | null;
  timelineLabel: string | null;
  referralSourceLabel: string | null;
}

export interface StudioLeadEmailData {
  locale: Locale;
  fullName: string;
  email: string;
  company: string;
  industryLabel: string | null;
  projectTypeLabel: string | null;
  budgetLabel: string | null;
  timelineLabel: string | null;
  referralSource: string | null;
  message: string;
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

export interface InstructorApplicationReceivedEmailData {
  locale: Locale;
  applicantName: string;
  applicantEmail: string;
}

export interface InstructorApplicationRejectedEmailData {
  locale: Locale;
  applicantName: string;
  applicantEmail: string;
  rejectionReason: string | null;
}

export interface InstructorApplicationAdminNotifyData {
  applicantName: string;
  applicantEmail: string;
  bioShort: string;
  proposedTopic: string | null;
  expertiseAreas: string[];
  sampleMaterialUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  whyHonuvibe: string | null;
  referredByPartnerName: string | null;
  applicationId: string;
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

export interface SurveySummaryData {
  professional_background: string;
  role_description: string;
  ai_knowledge_level: string;
  ai_tools_used: string[];
  learning_reasons: string[];
  ai_help_with: string[];
  specific_interests?: string | null;
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
  surveySummary?: SurveySummaryData;
}

export interface PaymentLinkEmailData {
  locale: Locale;
  email: string;
  fullName: string;
  courseTitle: string;
  paymentUrl: string;
  priceUsd: number; // cents
}

/** "Your session report is ready" — sent to a 1v1 student when a report publishes. */
export interface SessionReportReadyData {
  locale: Locale;
  email: string;
  fullName: string;
  courseTitle: string;
  /** Session date, pre-formatted for the recipient's locale. */
  sessionDate: string;
  /** Deep link to the reports tab: /learn/dashboard/{slug}?tab=reports (locale-prefixed). */
  reportUrl: string;
}

export interface StudentOnboardingEmailData {
  locale: Locale;
  fullName: string;
  email: string;
  dashboardUrl: string;
}

export interface SurveyAdminWithProfileData {
  recipients: string[];
  studentName: string;
  studentEmail?: string;
  surveyData: Record<string, unknown>;
  levelLabel: string;
  levelDescription: string;
  recommendedTools: RecommendedTool[];
  suggestedProjects: SuggestedProject[];
  aiForYourWork: string;
  learningPath: string;
}
