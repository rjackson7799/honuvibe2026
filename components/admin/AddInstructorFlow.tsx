'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, UserPlus, CheckCircle, Mail, MailX, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  searchUserByEmail,
  createInstructorProfile,
  createNewUserAndInstructor,
  sendInstructorWelcomeEmailAction,
} from '@/lib/instructors/actions';

type FoundUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
};

export function AddInstructorFlow() {
  const router = useRouter();
  const [step, setStep] = useState<'search' | 'profile' | 'done'>(
    'search',
  );

  // Step 1: Search
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [mode, setMode] = useState<'promote' | 'create' | null>(null);
  const [fullName, setFullName] = useState('');

  // Step 2: Profile
  const [displayName, setDisplayName] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleJp, setTitleJp] = useState('');
  const [bioShortEn, setBioShortEn] = useState('');
  const [bioShortJp, setBioShortJp] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [sendWelcome, setSendWelcome] = useState(true);
  const [emailLocale, setEmailLocale] = useState<'en' | 'ja'>('en');

  // Step 3: Done
  const [newProfileId, setNewProfileId] = useState('');
  const [emailStatus, setEmailStatus] = useState<'pending' | 'sent' | 'failed' | 'skipped'>('pending');
  const [emailError, setEmailError] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  async function handleSearch() {
    if (!email.trim()) return;
    setSearching(true);
    setSearchError('');
    setFoundUser(null);
    setMode(null);

    try {
      const user = await searchUserByEmail(email.trim().toLowerCase());
      if (!user) {
        setMode('create');
        return;
      }
      if (user.role === 'instructor') {
        setSearchError('This user is already an instructor.');
        return;
      }
      if (user.role === 'admin') {
        setSearchError('Admin accounts cannot be promoted to instructor.');
        return;
      }
      setFoundUser(user);
      setDisplayName(user.full_name ?? '');
      setMode('promote');
    } catch {
      setSearchError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  async function handleSendWelcomeEmail() {
    setSendingEmail(true);
    try {
      const result = await sendInstructorWelcomeEmailAction(
        email.trim().toLowerCase(),
        displayName.trim(),
        titleEn.trim() || null,
        titleJp.trim() || null,
        mode === 'create' ? 'new' : 'promoted',
        emailLocale,
      );
      setEmailStatus(result.success ? 'sent' : 'failed');
      if (!result.success) setEmailError(result.error ?? 'Unknown error');
    } catch (err) {
      setEmailStatus('failed');
      setEmailError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleCreate() {
    if (!displayName.trim()) return;
    setCreating(true);
    setCreateError('');

    const profileData = {
      display_name: displayName.trim(),
      title_en: titleEn.trim() || null,
      title_jp: titleJp.trim() || null,
      bio_short_en: bioShortEn.trim() || null,
      bio_short_jp: bioShortJp.trim() || null,
      website_url: websiteUrl.trim() || null,
    };

    try {
      let result: { id: string };

      if (mode === 'create') {
        result = await createNewUserAndInstructor(
          email.trim().toLowerCase(),
          fullName.trim(),
          profileData,
        );
      } else {
        if (!foundUser) return;
        result = await createInstructorProfile(foundUser.id, profileData);
      }

      setNewProfileId(result.id);
      setStep('done');

      // Send welcome email in background (non-blocking)
      if (sendWelcome) {
        setEmailStatus('pending');
        handleSendWelcomeEmail();
      } else {
        setEmailStatus('skipped');
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create instructor');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[600px]">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push('/admin/instructors')}
        className="flex items-center gap-1 text-sm text-fg-tertiary hover:text-fg-primary transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Instructors
      </button>

      <h1 className="text-2xl font-serif text-fg-primary">Add Instructor</h1>

      {/* Step 1: Search */}
      {step === 'search' && (
        <div className="space-y-4">
          <p className="text-sm text-fg-secondary">
            Enter an email to find an existing user or create a new instructor account.
          </p>

          <div className="flex gap-2">
            <input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleSearch}
              disabled={searching || !email.trim()}
            >
              <Search size={16} className="mr-1.5" />
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {searchError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <p className="text-sm text-red-400">{searchError}</p>
            </div>
          )}

          {foundUser && mode === 'promote' && (
            <div className="bg-bg-secondary border border-border-default rounded-lg p-4 space-y-3">
              <div>
                <p className="text-fg-primary font-medium">
                  {foundUser.full_name || 'Unknown'}
                </p>
                <p className="text-sm text-fg-tertiary">{foundUser.email}</p>
                <p className="text-xs text-fg-tertiary mt-1">
                  Current role: <span className="capitalize">{foundUser.role}</span>
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setStep('profile')}
              >
                <UserPlus size={16} className="mr-1.5" />
                Promote to Instructor
              </Button>
            </div>
          )}

          {mode === 'create' && (
            <div className="bg-bg-secondary border border-accent-teal/30 rounded-lg p-4 space-y-3">
              <p className="text-sm text-fg-secondary">
                No account found for <strong className="text-fg-primary">{email}</strong>.
                Create a new instructor account?
              </p>
              <div>
                <label className="block text-xs text-fg-tertiary mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && fullName.trim()) {
                      setDisplayName(fullName);
                      setStep('profile');
                    }
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setDisplayName(fullName);
                  setStep('profile');
                }}
                disabled={!fullName.trim()}
              >
                <UserPlus size={16} className="mr-1.5" />
                Create New Instructor
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Fill Profile */}
      {step === 'profile' && (
        <div className="space-y-4">
          <p className="text-sm text-fg-secondary">
            Fill in the instructor profile for <strong>{foundUser?.email ?? email}</strong>.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">
                Display Name *
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-fg-tertiary mb-1">
                  Title (EN)
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI Educator & Consultant"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
                />
              </div>
              <div>
                <label className="block text-xs text-fg-tertiary mb-1">
                  Title (JP)
                </label>
                <input
                  type="text"
                  placeholder="e.g. AIエデュケーター"
                  value={titleJp}
                  onChange={(e) => setTitleJp(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-fg-tertiary mb-1">
                  Short Bio (EN)
                </label>
                <textarea
                  placeholder="1-2 sentences..."
                  value={bioShortEn}
                  onChange={(e) => setBioShortEn(e.target.value)}
                  rows={2}
                  maxLength={200}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal resize-none"
                />
                <p className="text-xs text-fg-tertiary text-right mt-0.5">
                  {bioShortEn.length}/200
                </p>
              </div>
              <div>
                <label className="block text-xs text-fg-tertiary mb-1">
                  Short Bio (JP)
                </label>
                <textarea
                  placeholder="1〜2文..."
                  value={bioShortJp}
                  onChange={(e) => setBioShortJp(e.target.value)}
                  rows={2}
                  maxLength={200}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal resize-none"
                />
                <p className="text-xs text-fg-tertiary text-right mt-0.5">
                  {bioShortJp.length}/200
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs text-fg-tertiary mb-1">
                Website
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
              />
            </div>
          </div>

          {/* Welcome Email Options */}
          <div className="bg-bg-secondary border border-border-default rounded-lg p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendWelcome}
                onChange={(e) => setSendWelcome(e.target.checked)}
                className="w-4 h-4 rounded border-border-default bg-bg-tertiary text-accent-teal focus:ring-accent-teal accent-[var(--accent-teal)]"
              />
              <span className="text-sm text-fg-primary">
                {mode === 'create'
                  ? 'Send welcome email with password setup link'
                  : 'Send notification email about promotion'}
              </span>
            </label>
            {sendWelcome && (
              <div className="flex items-center gap-2 ml-6">
                <span className="text-xs text-fg-tertiary">Email language:</span>
                <button
                  type="button"
                  onClick={() => setEmailLocale('en')}
                  className={`px-2 py-0.5 text-xs rounded ${
                    emailLocale === 'en'
                      ? 'bg-accent-teal text-white'
                      : 'bg-bg-tertiary text-fg-tertiary hover:text-fg-primary'
                  } transition-colors`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setEmailLocale('ja')}
                  className={`px-2 py-0.5 text-xs rounded ${
                    emailLocale === 'ja'
                      ? 'bg-accent-teal text-white'
                      : 'bg-bg-tertiary text-fg-tertiary hover:text-fg-primary'
                  } transition-colors`}
                >
                  JP
                </button>
              </div>
            )}
          </div>

          {createError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <p className="text-sm text-red-400">{createError}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('search')}
              disabled={creating}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreate}
              disabled={creating || !displayName.trim()}
            >
              {creating ? 'Creating...' : 'Create Instructor Profile'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 'done' && (
        <div className="bg-accent-teal/10 border border-accent-teal/30 rounded-lg p-6 text-center space-y-3">
          <CheckCircle size={32} className="text-accent-teal mx-auto" />
          <p className="text-fg-primary font-medium">
            {displayName} is now an instructor!
          </p>
          <p className="text-sm text-fg-secondary">
            Upload a photo and complete their profile to finish setup.
          </p>

          {/* Email status */}
          <div className="flex items-center justify-center gap-2 text-sm">
            {emailStatus === 'pending' && (
              <>
                <RefreshCw size={14} className="text-fg-tertiary animate-spin" />
                <span className="text-fg-tertiary">Sending welcome email...</span>
              </>
            )}
            {emailStatus === 'sent' && (
              <>
                <Mail size={14} className="text-accent-teal" />
                <span className="text-accent-teal">Welcome email sent</span>
              </>
            )}
            {emailStatus === 'failed' && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <MailX size={14} className="text-red-400" />
                  <span className="text-red-400">Welcome email failed to send</span>
                </div>
                {emailError && (
                  <p className="text-xs text-red-400/70">{emailError}</p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSendWelcomeEmail}
                  disabled={sendingEmail}
                >
                  <RefreshCw size={14} className={`mr-1.5 ${sendingEmail ? 'animate-spin' : ''}`} />
                  {sendingEmail ? 'Resending...' : 'Resend Welcome Email'}
                </Button>
              </div>
            )}
            {emailStatus === 'skipped' && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <MailX size={14} className="text-fg-tertiary" />
                  <span className="text-fg-tertiary">Welcome email skipped</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSendWelcomeEmail}
                  disabled={sendingEmail}
                >
                  <Mail size={14} className={`mr-1.5 ${sendingEmail ? 'animate-spin' : ''}`} />
                  {sendingEmail ? 'Sending...' : 'Send Welcome Email Now'}
                </Button>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push(`/admin/instructors/${newProfileId}`)}
          >
            Complete Profile
          </Button>
        </div>
      )}
    </div>
  );
}
