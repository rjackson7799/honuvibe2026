import { getLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getUnreadCount } from '@/lib/notifications/queries';
import { StudentNav } from './StudentNav';
import { MemberTopBar } from './MemberTopBar';

type StudentDashboardLayoutProps = {
  children: React.ReactNode;
};

export async function StudentDashboardLayout({ children }: StudentDashboardLayoutProps) {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const prefix = locale === 'ja' ? '/ja' : '';

  // AuthGuard (one level up) already redirects unauthenticated users, so a user is
  // expected here; guard anyway and skip the bar if it's somehow absent.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let topBar: React.ReactNode = null;
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('full_name, role')
      .eq('id', user.id)
      .single();

    // Same derivation as the dashboard page: use || so an empty-string full_name
    // falls through to the email-prefix fallback.
    const displayName =
      (profile?.full_name && profile.full_name.trim()) ||
      user.email?.split('@')[0] ||
      '';
    const initial = displayName.trim().charAt(0).toUpperCase() || '?';
    const unreadCount = await getUnreadCount(user.id);

    topBar = (
      <MemberTopBar
        initial={initial}
        displayName={displayName}
        email={user.email ?? ''}
        unreadCount={unreadCount}
        settingsHref={`${prefix}/learn/dashboard/settings`}
        billingHref={`${prefix}/learn/dashboard/billing`}
        notificationsHref={`${prefix}/learn/dashboard/notifications`}
        notificationsLabel={t('nav_notifications')}
        isAdmin={profile?.role === 'admin'}
        adminHref={`${prefix}/admin`}
      />
    );
  }

  return (
    <div className="learn-zone flex min-h-screen bg-bg-primary text-fg-primary">
      <StudentNav />
      <div className="flex-1 flex flex-col min-w-0">
        {topBar}
        <main className="flex-1 px-5 sm:px-7 md:px-8 py-7 pb-24 md:pb-8 overflow-x-hidden relative z-0">
          {children}
        </main>
      </div>
    </div>
  );
}
