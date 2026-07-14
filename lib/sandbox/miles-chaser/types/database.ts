// Ported from MilesChaser (fictional demo data only) — trimmed to the sandbox slice.
// Database types matching the source Supabase schema (no database exists in the demo).

export type SubscriptionTier = 'free' | 'premium';
export type TravelFlexibility = 'weekends_only' | 'flexible_weekdays' | 'holidays_ok';
export type DigestDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type QualificationYearType = 'calendar' | 'anniversary' | 'rolling';
export type SyncMethod = 'manual' | 'ocr_screenshot' | 'csv_import';
export type TripStatus = 'planned' | 'completed' | 'cancelled' | 'pending_credit';
export type TripType = 'booked' | 'micro_vacation_suggestion' | 'mileage_run';
export type TripPurpose = 'business' | 'vacation' | 'wedding' | 'family' | 'mileage_run' | 'other';
export type EmailCategory = 'transactional' | 'notification' | 'marketing';

export interface Profile {
  id: string;
  display_name: string | null;
  home_airport: string | null;
  timezone: string;
  preferred_destinations: string[];
  travel_flexibility: TravelFlexibility | null;
  subscription_tier: SubscriptionTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  role: 'user' | 'admin';
  notification_prefs: Record<string, { email: boolean; in_app: boolean }>;
  email_unsubscribed_categories: EmailCategory[];
  email_digest_day: DigestDay;
  email_digest_time: string;
  auth_providers: string[];
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LoyaltyProgram {
  id: string;
  program_key: string;
  display_name: string;
  qualification_year_type: QualificationYearType;
  tiers: TierDefinition[];
  earning_rules: EarningRules;
  partner_airlines: string[];
  rules_version: string;
  rules_updated_at: string;
  is_active: boolean;
  created_at: string;
}

export interface TierDefinition {
  key: string;
  name: string;
  qm: number;
  qs: number;
  qd: number;
}

export interface EarningRules {
  default_earning_rate: number;
  fare_class_rates: Record<string, number>;
  qd_per_dollar_spent: number;
  qs_per_segment: number;
}

export interface UserProgramEnrollment {
  id: string;
  user_id: string;
  program_id: string;
  current_tier: string;
  target_tier: string;
  qualification_year_start: string;
  qualification_year_end: string;
  current_qualifying_miles: number;
  current_qualifying_segments: number;
  current_qualifying_dollars: number;
  last_synced_at: string | null;
  last_sync_method: SyncMethod | null;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  enrollment_id: string | null;
  is_earning_flight: boolean;
  status: TripStatus;
  trip_type: TripType;
  trip_purpose: TripPurpose | null;
  notes: string | null;
  imported_from_csv: boolean;
  csv_import_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripSegment {
  id: string;
  trip_id: string;
  origin: string;
  destination: string;
  departure_date: string;
  return_date: string | null;
  airline_code: string;
  marketing_carrier: string | null;
  flight_number: string | null;
  fare_class: string | null;
  is_partner_flight: boolean;
  estimated_qualifying_miles: number;
  estimated_qualifying_segments: number;
  estimated_qualifying_dollars: number;
  actual_qualifying_miles: number | null;
  actual_qualifying_segments: number | null;
  actual_qualifying_dollars: number | null;
  segment_order: number;
  created_at: string;
}

export interface MicroVacationRoute {
  id: string;
  origin: string;
  destination: string;
  typical_fare_low: number | null;
  typical_fare_high: number | null;
  current_fare_estimate: number | null;
  fare_updated_at: string | null;
  estimated_qualifying_miles: number;
  flight_duration_minutes: number | null;
  destination_tags: string[];
  is_active: boolean;
  created_at: string;
}
