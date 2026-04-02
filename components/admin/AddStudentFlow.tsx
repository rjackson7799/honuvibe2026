'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, UserPlus, CheckCircle, Mail, MailX, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { searchUserByEmail } from '@/lib/instructors/actions';
import { createNewUserAndStudent, sendStudentWelcomeEmailAction } from '@/lib/students/actions';
import { manualEnroll } from '@/lib/admin/actions';
import type { ActiveCourse } from '@/lib/admin/queries';

type FoundUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
};

type Props = {
  activeCourses: ActiveCourse[];
};

export function AddStudentFlow({ activeCourses }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<'search' | 'enroll' | 'done'>('search');

  // Step 1: Search
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [mode, setMode] = useState<'enroll' | 'create' | null>(null);
  const [fullName, setFullName] = useState('');

  // Step 2: Enroll
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [notes, setNotes] = useState('');
  const [sendWelcome, setSendWelcome] = useState(true);
  const [emailLocale, setEmailLocale] = useState<'en' | 'ja'>('en');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Step 3: Done
  const [addedUserId, setAddedUserId] = useState('');
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
      if (user.role === 'admin') {
        setSearchError('Admin accounts cannot be manually enrolled.');
        return;
      }
      setFoundUser(user);
      setFullName(user.full_name ?? '');
      setMode('enroll');
    } catch {
      setSearchError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  async function handleSendWelcomeEmail(userId: string, courseId: string) {
    setSendingEmail(true);
    const selectedCourse = activeCourses.find((c) => c.id === courseId);
    try {
      const result = await sendStudentWelcomeEmailAction(
        email.trim().toLowerCase(),
        fullName.trim(),
        mode === 'create' ? 'new' : 'existing',
        emailLocale,
        selectedCourse?.title_en,
        notes.trim() || undefined,
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

  async function handleSave() {
    if (mode === 'create' && !fullName.trim()) {
      setSaveError('Full name is required.');
      return;
    }
    setSaving(true);
    setSaveError('');

    try {
      let userId: string;

      if (mode === 'create') {
        const result = await createNewUserAndStudent(
          email.trim().toLowerCase(),
          fullName.trim(),
        );
        userId = result.userId;
      } else {
        if (!foundUser) return;
        userId = foundUser.id;
      }

      // Enroll in course if one was selected
      if (selectedCourseId) {
        await manualEnroll(userId, selectedCourseId, notes.trim() || undefined);
      }

      setAddedUserId(userId);
      setStep('done');

      if (sendWelcome) {
        setEmailStatus('pending');
        void handleSendWelcomeEmail(userId, selectedCourseId);
      } else {
        setEmailStatus('skipped');
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to add student');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[600px]">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push('/admin/students')}
        className="flex items-center gap-1 text-sm text-fg-tertiary hover:text-fg-primary transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Students
      </button>

      <h1 className="text-2xl font-serif text-fg-primary">Add Student</h1>

      {/* Step 1: Search */}
      {step === 'search' && (
        <div className="space-y-4">
          <p className="text-sm text-fg-secondary">
            Enter an email to find an existing user or create a new student account.
          </p>

          <div className="flex gap-2">
            <input
              type="email"
              placeholder="student@example.com"
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

          {foundUser && mode === 'enroll' && (
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
                onClick={() => setStep('enroll')}
              >
                <UserPlus size={16} className="mr-1.5" />
                Enroll this Student
              </Button>
            </div>
          )}

          {mode === 'create' && (
            <div className="bg-bg-secondary border border-accent-teal/30 rounded-lg p-4 space-y-3">
              <p className="text-sm text-fg-secondary">
                No account found for <strong className="text-fg-primary">{email}</strong>.
                Create a new student account?
              </p>
              <div>
                <label className="block text-xs text-fg-tertiary mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hiroaki Takii"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && fullName.trim()) setStep('enroll');
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setStep('enroll')}
                disabled={!fullName.trim()}
              >
                <UserPlus size={16} className="mr-1.5" />
                Create New Student
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Course & Notes */}
      {step === 'enroll' && (
        <div className="space-y-4">
          <p className="text-sm text-fg-secondary">
            Enrolling <strong className="text-fg-primary">{foundUser?.full_name ?? fullName}</strong> (
            {foundUser?.email ?? email}).
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">
                Course <span className="text-fg-tertiary">(optional)</span>
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
              >
                <option value="">— No course enrollment —</option>
                {activeCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title_en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-fg-tertiary mb-1">
                Notes <span className="text-fg-tertiary">(optional)</span>
              </label>
              <textarea
                placeholder="e.g. Vertice Society payment — April 2026"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal resize-none"
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
                  : 'Send welcome email with login link'}
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

          {saveError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <p className="text-sm text-red-400">{saveError}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('search')}
              disabled={saving}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Adding...' : selectedCourseId ? 'Add & Enroll Student' : 'Add Student'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 'done' && (
        <div className="bg-accent-teal/10 border border-accent-teal/30 rounded-lg p-6 text-center space-y-3">
          <CheckCircle size={32} className="text-accent-teal mx-auto" />
          <p className="text-fg-primary font-medium">
            {foundUser?.full_name ?? fullName} has been added!
          </p>
          {selectedCourseId && (
            <p className="text-sm text-fg-secondary">
              Enrolled in{' '}
              <strong>
                {activeCourses.find((c) => c.id === selectedCourseId)?.title_en}
              </strong>
            </p>
          )}

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
                {emailError && <p className="text-xs text-red-400/70">{emailError}</p>}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSendWelcomeEmail(addedUserId, selectedCourseId)}
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
                  onClick={() => handleSendWelcomeEmail(addedUserId, selectedCourseId)}
                  disabled={sendingEmail}
                >
                  <Mail size={14} className="mr-1.5" />
                  {sendingEmail ? 'Sending...' : 'Send Welcome Email Now'}
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-center">
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push(`/admin/students/${addedUserId}`)}
            >
              View Student
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep('search');
                setEmail('');
                setFullName('');
                setFoundUser(null);
                setMode(null);
                setSelectedCourseId('');
                setNotes('');
                setSendWelcome(true);
                setEmailLocale('en');
                setAddedUserId('');
                setEmailStatus('pending');
                setEmailError('');
              }}
            >
              Add Another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
