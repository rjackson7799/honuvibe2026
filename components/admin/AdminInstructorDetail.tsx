'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabNavigation } from '@/components/learn/TabNavigation';
import { StatusBadge } from './StatusBadge';
import { InstructorPhotoUploader } from './InstructorPhotoUploader';
import {
  updateInstructorProfile,
  demoteToStudent,
} from '@/lib/instructors/actions';
import type { InstructorWithUser } from '@/lib/instructors/types';

type InstructorDetailProps = {
  instructor: InstructorWithUser & {
    courses: {
      id: string;
      title_en: string;
      status: string;
      start_date: string | null;
    }[];
  };
};

export function AdminInstructorDetail({ instructor }: InstructorDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Profile form state
  const [displayName, setDisplayName] = useState(instructor.display_name);
  const [titleEn, setTitleEn] = useState(instructor.title_en ?? '');
  const [titleJp, setTitleJp] = useState(instructor.title_jp ?? '');
  const [bioShortEn, setBioShortEn] = useState(instructor.bio_short_en ?? '');
  const [bioShortJp, setBioShortJp] = useState(instructor.bio_short_jp ?? '');
  const [bioLongEn, setBioLongEn] = useState(instructor.bio_long_en ?? '');
  const [bioLongJp, setBioLongJp] = useState(instructor.bio_long_jp ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(instructor.website_url ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(instructor.linkedin_url ?? '');
  const [twitterUrl, setTwitterUrl] = useState(instructor.twitter_url ?? '');
  const [isActive, setIsActive] = useState(instructor.is_active);

  const [demoting, setDemoting] = useState(false);
  const [demoteError, setDemoteError] = useState('');

  const tabs = [
    { key: 'profile', label: 'Profile' },
    { key: 'courses', label: `Courses (${instructor.courses.length})` },
    { key: 'account', label: 'Account' },
  ];

  async function handleSave() {
    setSaving(true);
    setSaveMessage('');
    try {
      await updateInstructorProfile(instructor.id, {
        display_name: displayName.trim(),
        title_en: titleEn.trim() || null,
        title_jp: titleJp.trim() || null,
        bio_short_en: bioShortEn.trim() || null,
        bio_short_jp: bioShortJp.trim() || null,
        bio_long_en: bioLongEn.trim() || null,
        bio_long_jp: bioLongJp.trim() || null,
        website_url: websiteUrl.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        twitter_url: twitterUrl.trim() || null,
        is_active: isActive,
      });
      setSaveMessage('Saved successfully');
      router.refresh();
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDemote() {
    if (!confirm('Are you sure you want to remove this instructor role? Their profile will be deleted.')) {
      return;
    }
    setDemoting(true);
    setDemoteError('');
    try {
      await demoteToStudent(instructor.id);
      router.push('/admin/instructors');
    } catch (err) {
      setDemoteError(err instanceof Error ? err.message : 'Failed to demote');
    } finally {
      setDemoting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[880px]">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push('/admin/instructors')}
        className="flex items-center gap-1 text-sm text-fg-tertiary hover:text-fg-primary transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Instructors
      </button>

      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-serif text-fg-primary">{instructor.display_name}</h1>
        <StatusBadge status={instructor.is_active ? 'published' : 'archived'} />
      </div>

      <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Photo */}
          <div>
            <label className="block text-xs text-fg-tertiary mb-2">Photo</label>
            <InstructorPhotoUploader
              instructorId={instructor.id}
              currentUrl={instructor.photo_url}
              onUploadComplete={() => router.refresh()}
              onRemove={async () => {
                await updateInstructorProfile(instructor.id, { });
                router.refresh();
              }}
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs text-fg-tertiary mb-1">
              Display Name *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full max-w-md px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
            />
          </div>

          {/* Title EN/JP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Title (EN)</label>
              <input
                type="text"
                placeholder="e.g. AI Educator & Consultant"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
              />
            </div>
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Title (JP)</label>
              <input
                type="text"
                placeholder="e.g. AIエデュケーター"
                value={titleJp}
                onChange={(e) => setTitleJp(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
              />
            </div>
          </div>

          {/* Short Bio EN/JP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Short Bio (EN)</label>
              <textarea
                placeholder="1-2 sentences for course cards..."
                value={bioShortEn}
                onChange={(e) => setBioShortEn(e.target.value)}
                rows={3}
                maxLength={200}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal resize-none"
              />
              <p className="text-xs text-fg-tertiary text-right mt-0.5">{bioShortEn.length}/200</p>
            </div>
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Short Bio (JP)</label>
              <textarea
                placeholder="1〜2文..."
                value={bioShortJp}
                onChange={(e) => setBioShortJp(e.target.value)}
                rows={3}
                maxLength={200}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal resize-none"
              />
              <p className="text-xs text-fg-tertiary text-right mt-0.5">{bioShortJp.length}/200</p>
            </div>
          </div>

          {/* Long Bio EN/JP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Full Bio (EN)</label>
              <textarea
                placeholder="Detailed bio for course detail pages..."
                value={bioLongEn}
                onChange={(e) => setBioLongEn(e.target.value)}
                rows={5}
                maxLength={800}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal resize-none"
              />
              <p className="text-xs text-fg-tertiary text-right mt-0.5">{bioLongEn.length}/800</p>
            </div>
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">Full Bio (JP)</label>
              <textarea
                placeholder="コース詳細ページ用の詳細な経歴..."
                value={bioLongJp}
                onChange={(e) => setBioLongJp(e.target.value)}
                rows={5}
                maxLength={800}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal resize-none"
              />
              <p className="text-xs text-fg-tertiary text-right mt-0.5">{bioLongJp.length}/800</p>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-fg-primary">Links</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-fg-tertiary mb-1">Website</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
                />
              </div>
              <div>
                <label className="block text-xs text-fg-tertiary mb-1">LinkedIn</label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
                />
              </div>
              <div>
                <label className="block text-xs text-fg-tertiary mb-1">Twitter / X</label>
                <input
                  type="url"
                  placeholder="https://x.com/..."
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
                />
              </div>
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-border-default bg-bg-tertiary text-accent-teal focus:ring-accent-teal"
            />
            <span className="text-sm text-fg-primary">Active</span>
            <span className="text-xs text-fg-tertiary">(inactive instructors are hidden from public pages)</span>
          </label>

          {/* Save */}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving || !displayName.trim()}
            >
              <Save size={16} className="mr-1.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            {saveMessage && (
              <span className={`text-sm ${saveMessage.includes('fail') ? 'text-red-400' : 'text-accent-teal'}`}>
                {saveMessage}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Courses Tab */}
      {activeTab === 'courses' && (
        <div className="space-y-3">
          {instructor.courses.length === 0 ? (
            <p className="text-fg-tertiary text-center py-8">
              No courses assigned. Assign this instructor from the course detail page.
            </p>
          ) : (
            instructor.courses.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => router.push(`/admin/courses/${course.id}`)}
                className="w-full text-left bg-bg-secondary border border-border-default rounded-lg p-4 hover:border-border-hover transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="text-fg-primary font-medium">{course.title_en}</p>
                  {course.start_date && (
                    <p className="text-xs text-fg-tertiary mt-1">
                      Starts{' '}
                      {new Date(course.start_date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
                <StatusBadge status={course.status} />
              </button>
            ))
          )}
        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-bg-secondary border border-border-default rounded-lg p-3">
              <span className="text-xs text-fg-tertiary block mb-0.5">Email</span>
              <span className="text-sm text-fg-primary">{instructor.user.email ?? '—'}</span>
            </div>
            <div className="bg-bg-secondary border border-border-default rounded-lg p-3">
              <span className="text-xs text-fg-tertiary block mb-0.5">Auth Name</span>
              <span className="text-sm text-fg-primary">{instructor.user.full_name ?? '—'}</span>
            </div>
            <div className="bg-bg-secondary border border-border-default rounded-lg p-3">
              <span className="text-xs text-fg-tertiary block mb-0.5">User ID</span>
              <span className="text-sm text-fg-primary font-mono text-xs">{instructor.user_id}</span>
            </div>
            <div className="bg-bg-secondary border border-border-default rounded-lg p-3">
              <span className="text-xs text-fg-tertiary block mb-0.5">Profile Created</span>
              <span className="text-sm text-fg-primary">
                {new Date(instructor.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Danger zone */}
          <div className="border border-red-500/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              <h3 className="text-sm font-medium text-red-400">Danger Zone</h3>
            </div>
            <p className="text-xs text-fg-tertiary">
              Removing the instructor role will delete their instructor profile and revert them to a regular student account.
              This action cannot be undone.
            </p>
            {demoteError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <p className="text-sm text-red-400">{demoteError}</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={handleDemote}
              disabled={demoting}
            >
              {demoting ? 'Removing...' : 'Remove Instructor Role'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
