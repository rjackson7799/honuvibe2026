export interface PremiumCheckUser {
  role: string;
  subscription_tier: string | null;
  subscription_status: string | null;
  subscription_expires_at: string | null;
}

export function hasPremiumAccess(user: PremiumCheckUser): boolean {
  if (user.role === 'admin') return true;
  if (user.subscription_tier !== 'premium') return false;

  if (
    user.subscription_status === 'active' ||
    user.subscription_status === 'trialing'
  ) {
    return true;
  }

  // Grace period: cancelled but not yet expired
  if (
    user.subscription_status === 'cancelled' &&
    user.subscription_expires_at
  ) {
    return new Date() < new Date(user.subscription_expires_at);
  }

  return false;
}
