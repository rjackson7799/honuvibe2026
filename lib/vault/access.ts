import { createClient } from '@/lib/supabase/server';

export interface VaultAccessResult {
  hasAccess: boolean;
  source: 'subscription' | 'enrollment' | null;
  subscriptionStatus: string | null;
  activeCourseName: string | null;
}

export async function checkVaultAccess(userId: string): Promise<VaultAccessResult> {
  const supabase = await createClient();

  // Check subscription status
  const { data: user } = await supabase
    .from('users')
    .select('subscription_status, subscription_tier')
    .eq('id', userId)
    .single();

  if (user?.subscription_status === 'active') {
    return {
      hasAccess: true,
      source: 'subscription',
      subscriptionStatus: user.subscription_status,
      activeCourseName: null,
    };
  }

  // Check for active course enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, course:courses(title_en)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (enrollment) {
    const course = enrollment.course as unknown as { title_en: string } | null;
    return {
      hasAccess: true,
      source: 'enrollment',
      subscriptionStatus: user?.subscription_status ?? 'none',
      activeCourseName: course?.title_en ?? null,
    };
  }

  return {
    hasAccess: false,
    source: null,
    subscriptionStatus: user?.subscription_status ?? 'none',
    activeCourseName: null,
  };
}
