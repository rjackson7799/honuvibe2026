// Enrollment-related TypeScript types

import type { Course } from '@/lib/courses/types';

export type EnrollmentStatus = 'active' | 'completed' | 'refunded' | 'cancelled';
export type Currency = 'usd' | 'jpy';

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_paid: number | null;
  currency: Currency;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
}

export interface EnrollmentWithCourse extends Enrollment {
  course: Course;
}

export interface EnrollmentCheck {
  is_enrolled: boolean;
  enrollment: Enrollment | null;
}
