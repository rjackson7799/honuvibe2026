'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter as useI18nRouter, usePathname as useI18nPathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  Lock,
  FlaskConical,
  Route,
  Users,
  CreditCard,
  UserCircle,
  GraduationCap,
  CalendarDays,
  Shield,
  LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { HonuVibeWordmark } from '@/components/ui/honuvibe-wordmark';

type NavItem = {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
  ns?: string;
};

const baseNavItems: NavItem[] = [
  { href: '/learn/dashboard', labelKey: 'nav_dashboard', icon: LayoutDashboard, exact: true },
  { href: '/learn/dashboard/courses', labelKey: 'nav_courses', icon: BookOpen, exact: false },
  { href: '/learn/vault', labelKey: 'nav_vault', icon: Lock, exact: false },
  { href: '/learn/vault/workbench', labelKey: 'nav_workbench', icon: FlaskConical, exact: false },
  { href: '/learn/paths/new', labelKey: 'nav_study_paths', icon: Route, exact: false },
  { href: '/learn/dashboard/events', labelKey: 'nav_events', icon: CalendarDays, exact: false },
  { href: '/learn/dashboard/community', labelKey: 'nav_community', icon: Users, exact: false },
  { href: '/learn/dashboard/billing', labelKey: 'nav_billing', icon: CreditCard, exact: false },
  { href: '/learn/dashboard/settings', labelKey: 'nav_profile', icon: UserCircle, exact: false },
];

const instructorNavItem: NavItem = {
  href: '/learn/dashboard/my-classes',
  labelKey: 'my_classes',
  icon: GraduationCap,
  exact: false,
  ns: 'instructor',
};

function LangPills() {
  const locale = useLocale();
  const i18nPathname = useI18nPathname();
  const i18nRouter = useI18nRouter();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: 'en' | 'ja') => {
    if (newLocale === locale) return;
    document.cookie = `NEXT_LOCALE=${newLocale};max-age=${60 * 60 * 24 * 30};path=/`;
    startTransition(() => {
      i18nRouter.replace(i18nPathname, { locale: newLocale });
    });
  };

  const pillClass = (active: boolean) =>
    cn(
      'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors duration-[var(--duration-fast)]',
      active
        ? 'bg-[color:var(--accent-teal)] text-white'
        : 'text-fg-tertiary hover:text-fg-secondary',
    );

  return (
    <div className={cn('flex items-center gap-1', isPending && 'opacity-50 pointer-events-none')}>
      <button type="button" onClick={() => switchLocale('en')} className={pillClass(locale === 'en')}>
        EN
      </button>
      <button type="button" onClick={() => switchLocale('ja')} className={pillClass(locale === 'ja')}>
        日本語
      </button>
    </div>
  );
}

export function StudentNav() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('dashboard');
  const tInstructor = useTranslations('instructor');
  const navT = useTranslations('nav');

  const [isInstructor, setIsInstructor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role === 'admin') setIsAdmin(true);

      if (profile?.role === 'instructor' || profile?.role === 'admin') {
        const { data: instrProfile } = await supabase
          .from('instructor_profiles')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .maybeSingle();

        setIsInstructor(!!instrProfile);
      }
    }
    check();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  const logicalPath = pathname.replace(/^\/(en|ja)/, '') || '/';

  const navItems: NavItem[] = isInstructor
    ? [...baseNavItems.slice(0, 4), instructorNavItem, ...baseNavItems.slice(4)]
    : baseNavItems;

  // Mobile bottom bar: cap at 6 slots and always pin Settings last — it's the
  // only mobile route to account settings + sign-out, and the instructor entry
  // would otherwise push it off the end.
  const settingsItem = navItems.find((i) => i.href === '/learn/dashboard/settings');
  const mobilePrimary = navItems.filter(
    (i) =>
      i.href !== '/learn/dashboard/events' &&
      i.href !== '/learn/dashboard/community' &&
      i.href !== '/learn/dashboard/billing' &&
      i.href !== '/learn/dashboard/settings',
  );
  const mobileItems = settingsItem
    ? [...mobilePrimary.slice(0, 5), settingsItem]
    : mobilePrimary.slice(0, 6);

  // Most-specific match wins, so a parent entry (Vault) doesn't stay highlighted
  // when a nested entry (Workbench at /learn/vault/workbench) is the active one.
  const matchesPath = (item: NavItem) =>
    item.exact
      ? logicalPath === item.href
      : logicalPath === item.href || logicalPath.startsWith(`${item.href}/`);
  const isItemActive = (item: NavItem) =>
    matchesPath(item) &&
    !navItems.some(
      (other) => other !== item && other.href.length > item.href.length && matchesPath(other),
    );

  const getLabel = (item: NavItem) =>
    item.ns === 'instructor' ? tInstructor(item.labelKey) : t(item.labelKey);

  const itemClass = (active: boolean, muted = false) =>
    cn(
      'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-[13.5px] text-left transition-all duration-[var(--duration-fast)]',
      active
        ? 'bg-[color:var(--accent-teal)] text-white font-semibold shadow-sm'
        : muted
          ? 'text-fg-tertiary hover:text-fg-secondary hover:bg-[rgba(26,43,51,0.05)]'
          : 'text-fg-secondary hover:text-fg-primary hover:bg-[rgba(26,43,51,0.05)] font-medium',
    );

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col shrink-0 w-[220px] h-screen sticky top-0 bg-bg-tertiary border-r border-border-default">
        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b border-border-default flex items-center">
          <HonuVibeWordmark />
        </div>

        {/* Lang pills */}
        <div className="px-4 py-3 border-b border-border-default">
          <LangPills />
        </div>

        {/* Main nav */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-3">
          <div className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive = isItemActive(item);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={itemClass(isActive)}>
                  <Icon size={17} className="shrink-0 opacity-90" />
                  <span className="truncate">{getLabel(item)}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom: admin (if applicable) + sign out */}
        <div className="border-t border-border-default px-2.5 py-3 flex flex-col gap-0.5">
          {isAdmin && (
            <Link href="/admin" className={itemClass(false, true)}>
              <Shield size={17} className="shrink-0 opacity-90" />
              <span className="truncate">{navT('admin')}</span>
            </Link>
          )}
          <button type="button" onClick={handleSignOut} className={itemClass(false, true)}>
            <LogOut size={17} className="shrink-0 opacity-90" />
            <span className="truncate">{navT('sign_out')}</span>
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav — restyled for canvas palette */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-tertiary border-t border-border-default flex">
        {mobileItems.map((item) => {
          const isActive = isItemActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors',
                isActive
                  ? 'text-[color:var(--accent-teal)]'
                  : 'text-fg-tertiary hover:text-fg-secondary',
              )}
            >
              <Icon size={18} />
              <span className="truncate max-w-full px-1">{getLabel(item)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
