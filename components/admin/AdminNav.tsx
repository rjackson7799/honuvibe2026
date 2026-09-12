'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Lock,
  Users,
  FileText,
  DollarSign,
  ClipboardList,
  Handshake,
  Inbox,
  MessageSquare,
  UserPlus,
  FileEdit,
  Wallet,
  Shield,
  CalendarDays,
  CalendarCheck,
  ListChecks,
  Ticket,
  FlaskConical,
  Lightbulb,
  Quote,
  Briefcase,
  Milestone,
  Radar,
  UserRound,
  Route,
  Settings,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { LangToggle } from '@/components/layout/lang-toggle';
import { UserMenu } from '@/components/layout/user-menu';
import { HonuVibeWordmark } from '@/components/ui/honuvibe-wordmark';

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/admin/revenue', label: 'Revenue', icon: DollarSign },
    ],
  },
  {
    label: 'Learning',
    items: [
      { href: '/admin/courses', label: 'Courses', icon: BookOpen },
      { href: '/admin/courses/proposals', label: 'Proposals', icon: FileEdit },
      { href: '/admin/instructors', label: 'Instructors', icon: GraduationCap },
      { href: '/admin/instructor-applications', label: 'Instructor Apps', icon: UserPlus },
      { href: '/admin/events', label: 'Events', icon: CalendarDays },
      { href: '/admin/event-registrations', label: 'Event RSVPs', icon: Ticket },
      { href: '/admin/course-surveys', label: 'Course Surveys', icon: ListChecks },
      { href: '/admin/business-upgrades', label: 'Business Upgrades', icon: Route },
      { href: '/admin/tutoring', label: '1v1 Sessions', icon: UserRound },
    ],
  },
  {
    label: 'Members',
    items: [
      { href: '/admin/students', label: 'Students', icon: Users },
      { href: '/admin/partners', label: 'Partners', icon: Handshake },
      { href: '/admin/applications', label: 'Applications', icon: FileText },
      { href: '/admin/partnership-inquiries', label: 'Partnership Inquiries', icon: Inbox },
      { href: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
    ],
  },
  {
    label: 'Studio',
    items: [
      { href: '/admin/studio/leads', label: 'Studio Leads', icon: Briefcase },
      // Sibling prefix of /admin/studio/leads — the default startsWith match
      // already disambiguates them, so no isItemActive special case.
      { href: '/admin/studio/engagements', label: 'Engagements', icon: Milestone },
      { href: '/admin/prospects', label: 'Prospects', icon: Radar },
      { href: '/admin/blue-filler', label: 'Blue Filler', icon: Lightbulb },
    ],
  },
  {
    label: 'Community',
    items: [
      { href: '/admin/community', label: 'Moderation', icon: Shield },
      { href: '/admin/surveys', label: 'Surveys', icon: ClipboardList },
      { href: '/admin/event-surveys', label: 'Event Surveys', icon: CalendarCheck },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/vault', label: 'Vault', icon: Lock },
      { href: '/admin/workbench', label: 'Workbench', icon: FlaskConical },
      { href: '/admin/proof', label: 'Proof', icon: Quote },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/admin/payouts/instructors', label: 'Payouts', icon: Wallet },
    ],
  },
  {
    label: 'Settings',
    items: [
      { href: '/admin/settings', label: 'Site Settings', icon: Settings },
    ],
  },
];

const flatItems: NavItem[] = navGroups.flatMap((g) => g.items);

/** localStorage key holding the labels of collapsed sidebar groups (JSON array). */
export const ADMIN_NAV_COLLAPSED_KEY = 'honuvibe-admin-nav-collapsed';

const knownGroupLabels = new Set(navGroups.map((g) => g.label));

function readCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(ADMIN_NAV_COLLAPSED_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((v): v is string => typeof v === 'string' && knownGroupLabels.has(v)),
    );
  } catch {
    return new Set();
  }
}

function writeCollapsed(collapsed: Set<string>) {
  try {
    // Persist in nav order so the stored value is stable regardless of click order.
    const ordered = navGroups.map((g) => g.label).filter((l) => collapsed.has(l));
    localStorage.setItem(ADMIN_NAV_COLLAPSED_KEY, JSON.stringify(ordered));
  } catch {
    // Storage unavailable (private mode, quota) — collapse still works for this page view.
  }
}

function groupPanelId(label: string) {
  return `admin-nav-group-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function isItemActive(item: NavItem, logicalPath: string): boolean {
  if (item.exact) return logicalPath === item.href;
  const matchesHref =
    logicalPath === item.href || logicalPath.startsWith(`${item.href}/`);
  if (item.href === '/admin/courses') {
    return (
      matchesHref &&
      !logicalPath.startsWith('/admin/courses/proposals')
    );
  }
  return matchesHref;
}

export function AdminNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const logicalPath = pathname.replace(/^\/(en|ja)/, '') || '/';

  // Server and first client render agree on "all expanded"; the persisted
  // choice is applied after mount to avoid a hydration mismatch. `hydrated`
  // gates the persist effect so the pre-read default never overwrites storage.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setCollapsed(readCollapsed());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) writeCollapsed(collapsed);
  }, [collapsed, hydrated]);

  const toggleGroup = useCallback((label: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const userMenuLabels = {
    signIn: t('sign_in'),
    account: t('account'),
    dashboard: t('dashboard'),
    studentView: t('student_view'),
    admin: t('admin'),
    signOut: t('sign_out'),
  };

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        data-testid="admin-sidebar"
        className="hidden md:flex flex-col shrink-0 w-56 h-screen sticky top-0 bg-bg-secondary border-r border-border-default"
      >
        {/* Logo */}
        <div className="px-5 h-14 border-b border-border-default flex items-center">
          <HonuVibeWordmark />
        </div>

        {/* Grouped nav */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-3">
          <div className="flex flex-col gap-3">
            {navGroups.map((group) => {
              const isOpen = !collapsed.has(group.label);
              const panelId = groupPanelId(group.label);
              const containsActive = group.items.some((item) =>
                isItemActive(item, logicalPath),
              );
              return (
                <div key={group.label} className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-tertiary transition-colors duration-[var(--duration-fast)] hover:text-fg-secondary hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal/40"
                  >
                    <span className="flex items-center gap-2">
                      {group.label}
                      {!isOpen && containsActive && (
                        <span
                          data-testid="nav-group-active-dot"
                          role="img"
                          aria-label="Contains current page"
                          className="inline-block size-1.5 rounded-full bg-accent-teal"
                        />
                      )}
                    </span>
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className={cn(
                        'shrink-0 transition-transform duration-[var(--duration-fast)] motion-reduce:transition-none',
                        !isOpen && '-rotate-90',
                      )}
                    />
                  </button>
                  {/* Stays mounted so aria-controls always resolves; `hidden` does the collapsing. */}
                  <div id={panelId} hidden={!isOpen} className="flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const isActive = isItemActive(item, logicalPath);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-[var(--duration-fast)]',
                            isActive
                              ? 'bg-accent-teal/10 text-accent-teal font-medium'
                              : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary',
                          )}
                        >
                          <Icon size={18} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom controls — avatar dropdown + lang */}
        <div className="border-t border-border-default px-3 py-3 flex items-center justify-between gap-2">
          <UserMenu labels={userMenuLabels} variant="dropdown" placement="top" />
          <LangToggle />
        </div>
      </nav>

      {/* Mobile bottom nav — flat for now, grouping doesn't fit a horizontal strip */}
      <nav
        data-testid="admin-mobile-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border-default bg-bg-secondary flex overflow-x-auto"
      >
        {flatItems.map((item) => {
          const isActive = isItemActive(item, logicalPath);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'shrink-0 min-w-[72px] flex flex-col items-center gap-1 py-3 px-2 text-[10px] transition-colors',
                isActive ? 'text-accent-teal' : 'text-fg-tertiary',
              )}
            >
              <Icon size={20} />
              <span className="truncate max-w-full">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
