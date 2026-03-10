export type PaymentType = 'course_purchase' | 'vault_subscription' | 'vault_renewal';
export type PaymentStatus = 'succeeded' | 'refunded' | 'failed';

export interface Payment {
  id: string;
  user_id: string;
  type: PaymentType;
  course_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  stripe_checkout_session_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  receipt_url: string | null;
  description: string | null;
  created_at: string;
}

export interface PaymentWithUser extends Payment {
  user_email: string | null;
  user_name: string | null;
}
