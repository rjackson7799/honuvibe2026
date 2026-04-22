export type InstructorApplicationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export interface InstructorApplication {
  id: string;
  applicant_user_id: string | null;
  applicant_email: string;
  applicant_full_name: string;
  applicant_locale: 'en' | 'ja';
  referred_by_partner_id: string | null;
  bio_short: string;
  expertise_areas: string[] | null;
  proposed_topic: string | null;
  sample_material_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  why_honuvibe: string | null;
  status: InstructorApplicationStatus;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  created_instructor_profile_id: string | null;
  submitted_at: string;
  updated_at: string;
}

export interface InstructorApplicationWithPartner extends InstructorApplication {
  partner_name: string | null;
  partner_slug: string | null;
}

export interface InstructorApplicationSubmitInput {
  applicant_email: string;
  applicant_full_name: string;
  applicant_locale: 'en' | 'ja';
  bio_short: string;
  expertise_areas: string[];
  proposed_topic: string;
  sample_material_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  why_honuvibe: string | null;
  partner_slug: string | null;
}
