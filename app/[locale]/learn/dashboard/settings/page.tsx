'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function getInitials(name: string, email: string): string {
  const source = name.trim() || email.trim();
  if (!source) return '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function SettingsPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
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
        .select('full_name, locale_preference, avatar_url')
        .eq('id', user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name ?? '');
        setLangPref(profile.locale_preference ?? locale);
        setAvatarUrl(profile.avatar_url ?? null);
      }
      setLoading(false);
    }
    loadProfile();
  }, [locale]);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setAvatarError(null);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setAvatarUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'too_large') setAvatarError(t('profile_avatar_too_large'));
        else if (data.code === 'wrong_type') setAvatarError(t('profile_avatar_wrong_type'));
        else setAvatarError(t('profile_avatar_upload_failed'));
        setAvatarPreview(null);
        URL.revokeObjectURL(objectUrl);
        return;
      }

      setAvatarUrl(data.avatar_url);
      setAvatarPreview(null);
      URL.revokeObjectURL(objectUrl);
    } catch {
      setAvatarError(t('profile_avatar_upload_failed'));
      setAvatarPreview(null);
      URL.revokeObjectURL(objectUrl);
    } finally {
      setAvatarUploading(false);
    }
  };

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
        <h1 className="text-2xl font-serif text-fg-primary">{t('profile_heading')}</h1>
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-bg-tertiary rounded-lg" />
          <div className="h-12 bg-bg-tertiary rounded-lg" />
          <div className="h-12 bg-bg-tertiary rounded-lg" />
        </div>
      </div>
    );
  }

  const displayAvatar = avatarPreview ?? avatarUrl;

  return (
    <div className="space-y-8 max-w-[600px]">
      <h1 className="text-2xl font-serif text-fg-primary">{t('profile_heading')}</h1>

      {/* Profile section */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-6 space-y-5">
        <h2 className="text-sm font-semibold text-fg-primary uppercase tracking-wider">
          {t('settings_profile')}
        </h2>

        {/* Avatar */}
        <div>
          <label className="block text-sm text-fg-secondary mb-2">
            {t('profile_avatar_label')}
          </label>
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24 rounded-full overflow-hidden bg-bg-tertiary border border-border-default flex items-center justify-center shrink-0">
              {displayAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-medium text-fg-secondary">
                  {getInitials(fullName, email)}
                </span>
              )}
              {avatarUploading && (
                <div className="absolute inset-0 bg-bg-primary/70 flex items-center justify-center">
                  <div className="h-5 w-5 border-2 border-accent-teal border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-fg-secondary border border-border-default hover:bg-bg-tertiary hover:text-fg-primary disabled:opacity-50 transition-colors"
              >
                {avatarUploading ? t('profile_avatar_uploading') : t('profile_avatar_change')}
              </button>
              {avatarError && (
                <p className="mt-2 text-sm text-red-500">{avatarError}</p>
              )}
            </div>
          </div>
        </div>

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
