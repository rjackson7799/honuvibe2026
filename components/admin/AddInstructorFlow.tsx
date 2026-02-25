'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, UserPlus, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { searchUserByEmail, createInstructorProfile } from '@/lib/instructors/actions';

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

  // Step 2: Profile
  const [displayName, setDisplayName] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleJp, setTitleJp] = useState('');
  const [bioShortEn, setBioShortEn] = useState('');
  const [bioShortJp, setBioShortJp] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Step 3: Done
  const [newProfileId, setNewProfileId] = useState('');

  async function handleSearch() {
    if (!email.trim()) return;
    setSearching(true);
    setSearchError('');
    setFoundUser(null);

    try {
      const user = await searchUserByEmail(email.trim().toLowerCase());
      if (!user) {
        setSearchError('No account found with that email. The user must sign up first.');
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
    } catch {
      setSearchError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  async function handleCreate() {
    if (!foundUser || !displayName.trim()) return;
    setCreating(true);
    setCreateError('');

    try {
      const { id } = await createInstructorProfile(foundUser.id, {
        display_name: displayName.trim(),
        title_en: titleEn.trim() || null,
        title_jp: titleJp.trim() || null,
        bio_short_en: bioShortEn.trim() || null,
        bio_short_jp: bioShortJp.trim() || null,
        website_url: websiteUrl.trim() || null,
      });
      setNewProfileId(id);
      setStep('done');
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
            Search for an existing user account by email to promote them to instructor.
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

          {foundUser && (
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
        </div>
      )}

      {/* Step 2: Fill Profile */}
      {step === 'profile' && foundUser && (
        <div className="space-y-4">
          <p className="text-sm text-fg-secondary">
            Fill in the instructor profile for <strong>{foundUser.email}</strong>.
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
