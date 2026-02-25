'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [langPref, setLangPref] = useState<'en' | 'ja'>(locale as 'en' | 'ja');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email ?? '');

      const { data: profile } = await supabase
        .from('users')
        .select('full_name, locale_preference')
        .eq('id', user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name ?? '');
        setLangPref(profile.locale_preference ?? locale);
      }
      setLoading(false);
    }
    loadProfile();
  }, [locale]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('users')
        .update({
          full_name: fullName,
          locale_preference: langPref,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    const prefix = locale === 'ja' ? '/ja' : '';
    router.push(`${prefix}/learn/auth`);
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-[600px]">
        <h1 className="text-2xl font-serif text-fg-primary">{t('settings_heading')}</h1>
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-bg-tertiary rounded-lg" />
          <div className="h-12 bg-bg-tertiary rounded-lg" />
          <div className="h-12 bg-bg-tertiary rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[600px]">
      <h1 className="text-2xl font-serif text-fg-primary">{t('settings_heading')}</h1>

      {/* Profile section */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-6 space-y-5">
        <h2 className="text-sm font-semibold text-fg-primary uppercase tracking-wider">
          {t('settings_profile')}
        </h2>

        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-sm text-fg-secondary mb-1.5">
            {t('settings_name')}
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-bg-primary border border-border-default text-fg-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-teal/50 focus:border-accent-teal transition-colors"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label htmlFor="email" className="block text-sm text-fg-secondary mb-1.5">
            {t('settings_email')}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            disabled
            className="w-full px-3 py-2.5 rounded-lg bg-bg-tertiary border border-border-default text-fg-tertiary text-sm cursor-not-allowed"
          />
        </div>
      </div>

      {/* Preferences section */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-6 space-y-5">
        <h2 className="text-sm font-semibold text-fg-primary uppercase tracking-wider">
          {t('settings_preferences')}
        </h2>

        {/* Language */}
        <div>
          <label htmlFor="language" className="block text-sm text-fg-secondary mb-1.5">
            {t('settings_language')}
          </label>
          <select
            id="language"
            value={langPref}
            onChange={(e) => setLangPref(e.target.value as 'en' | 'ja')}
            className="w-full px-3 py-2.5 rounded-lg bg-bg-primary border border-border-default text-fg-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-teal/50 focus:border-accent-teal transition-colors"
          >
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg text-sm font-medium bg-accent-teal text-white hover:bg-accent-teal-hover disabled:opacity-50 transition-colors"
        >
          {saving ? '...' : t('settings_save')}
        </button>
        {saved && (
          <span className="text-sm text-accent-teal">{t('settings_saved')}</span>
        )}
      </div>

      {/* Sign out */}
      <div className="pt-4 border-t border-border-default">
        <button
          onClick={handleSignOut}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-fg-secondary border border-border-default hover:bg-bg-tertiary hover:text-fg-primary transition-colors"
        >
          {t('settings_sign_out')}
        </button>
      </div>
    </div>
  );
}
