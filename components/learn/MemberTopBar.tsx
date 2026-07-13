import Link from 'next/link';
import { Bell } from 'lucide-react';
import { AccountMenu } from './AccountMenu';
import { FeedbackButton } from './FeedbackButton';

type MemberTopBarProps = {
  initial: string;
  displayName: string;
  email: string;
  settingsHref: string;
  billingHref: string;
  notificationsHref: string;
  notificationsLabel: string;
  isAdmin: boolean;
  adminHref: string;
  unreadCount?: number;
};

/**
 * Persistent member-area top bar: a Feedback pill, the notification bell (with
 * unread badge), and the account avatar (which opens a dropdown). Rendered once
 * by StudentDashboardLayout so it appears identically on every member page.
 */
export function MemberTopBar({
  initial,
  displayName,
  email,
  settingsHref,
  billingHref,
  notificationsHref,
  notificationsLabel,
  isAdmin,
  adminHref,
  unreadCount = 0,
}: MemberTopBarProps) {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-end gap-2.5 h-14 px-5 sm:px-7 md:px-8 bg-bg-primary border-b border-border-default">
      <FeedbackButton />
      <Link
        href={notificationsHref}
        aria-label={notificationsLabel}
        className="relative w-[38px] h-[38px] rounded-[10px] bg-bg-secondary border border-border-default text-fg-secondary hover:text-fg-primary hover:border-border-hover transition-all flex items-center justify-center"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[color:var(--accent-coral)] text-white text-[10px] font-bold leading-[16px] text-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>
      <AccountMenu
        initial={initial}
        displayName={displayName}
        email={email}
        settingsHref={settingsHref}
        billingHref={billingHref}
        isAdmin={isAdmin}
        adminHref={adminHref}
      />
    </div>
  );
}
