import Link from 'next/link';
import { Bell } from 'lucide-react';

type DashboardWelcomeHeaderProps = {
  overlineDate: string;
  welcomeLabel: string;
  initial: string;
  displayName: string;
  settingsHref: string;
  notificationsHref?: string;
  showNotificationDot?: boolean;
};

export function DashboardWelcomeHeader({
  overlineDate,
  welcomeLabel,
  initial,
  displayName,
  settingsHref,
  notificationsHref,
  showNotificationDot = true,
}: DashboardWelcomeHeaderProps) {
  const NotificationButton = (
    <>
      <Bell size={17} />
      {showNotificationDot && (
        <span className="absolute top-2 right-2 w-[7px] h-[7px] rounded-full bg-[color:var(--accent-coral)] ring-[1.5px] ring-bg-secondary" />
      )}
    </>
  );

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[12px] font-semibold tracking-[0.05em] text-fg-tertiary mb-1">
          {overlineDate}
        </p>
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
          {welcomeLabel} <span aria-hidden>👋</span>
        </h1>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        {notificationsHref ? (
          <Link
            href={notificationsHref}
            aria-label="Notifications"
            className="relative w-[38px] h-[38px] rounded-[10px] bg-bg-secondary border border-border-default text-fg-secondary hover:text-fg-primary hover:border-border-hover transition-all flex items-center justify-center"
          >
            {NotificationButton}
          </Link>
        ) : (
          <button
            type="button"
            aria-label="Notifications"
            className="relative w-[38px] h-[38px] rounded-[10px] bg-bg-secondary border border-border-default text-fg-secondary hover:text-fg-primary hover:border-border-hover transition-all flex items-center justify-center"
          >
            {NotificationButton}
          </button>
        )}
        <Link
          href={settingsHref}
          aria-label={displayName}
          className="w-[38px] h-[38px] rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[15px] font-bold flex items-center justify-center transition-colors"
        >
          {initial}
        </Link>
      </div>
    </div>
  );
}
