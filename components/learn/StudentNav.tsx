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
  Users,
  CreditCard,
  UserCircle,
  GraduationCap,
  Shield,
  LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
          <span className="text-[18px] font-bold text-fg-primary tracking-[-0.01em]">
            HonuVibe<span className="text-[color:var(--accent-teal)]">.AI</span>
          </span>
        </div>

        {/* Lang pills */}
        <div className="px-4 py-3 border-b border-border-default">
          <LangPills />
        </div>

        {/* Main nav */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-3">
          <div className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive = item.exact
                ? logicalPath === item.href
                : logicalPath.startsWith(item.href);
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
        {navItems.slice(0, 6).map((item) => {
          const isActive = item.exact
            ? logicalPath === item.href
            : logicalPath.startsWith(item.href);
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
