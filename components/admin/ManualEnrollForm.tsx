'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, UserPlus, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { manualEnroll, searchUsers } from '@/lib/admin/actions';

type SearchResult = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
};

type ManualEnrollFormProps = {
  courseId: string;
  enrolledStudentIds?: string[];
};

export function ManualEnrollForm({ courseId, enrolledStudentIds = [] }: ManualEnrollFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'search' | 'uuid'>('search');

  // Search mode state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<Map<string, SearchResult>>(new Map());
  const [searching, setSearching] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [feedback, setFeedback] = useState<{
    enrolled: string[];
    errors: { name: string; message: string }[];
  } | null>(null);

  // UUID mode state
  const [userId, setUserId] = useState('');
  const [uuidLoading, setUuidLoading] = useState(false);
  const [uuidError, setUuidError] = useState('');
  const [uuidSuccess, setUuidSuccess] = useState(false);

  // Payment link state
  const [linkEmail, setLinkEmail] = useState('');
  const [linkLocale, setLinkLocale] = useState<'en' | 'ja'>('en');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkResult, setLinkResult] = useState<{ success?: boolean; error?: string } | null>(null);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchUsers(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const toggleSelect = useCallback((user: SearchResult) => {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(user.id)) {
        next.delete(user.id);
      } else {
        next.set(user.id, user);
      }
      return next;
    });
  }, []);

  const removeSelected = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  async function handleBatchEnroll() {
    if (selected.size === 0) return;
    setEnrolling(true);
    setFeedback(null);

    const enrolled: string[] = [];
    const errors: { name: string; message: string }[] = [];

    for (const [id, user] of selected) {
      const result = await manualEnroll(id, courseId);
      if (result.success) {
        enrolled.push(user.full_name ?? user.email ?? id);
      } else {
        errors.push({
          name: user.full_name ?? user.email ?? id,
          message: result.error,
        });
      }
    }

    setFeedback({ enrolled, errors });
    setSelected(new Map());
    setEnrolling(false);
    router.refresh();
  }

  async function handleUuidSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim()) return;

    setUuidLoading(true);
    setUuidError('');
    setUuidSuccess(false);

    const result = await manualEnroll(userId.trim(), courseId);
    if (result.success) {
      setUuidSuccess(true);
      setUserId('');
      router.refresh();
      setTimeout(() => setUuidSuccess(false), 3000);
    } else {
      setUuidError(result.error);
    }
    setUuidLoading(false);
  }

  async function handleSendPaymentLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkEmail.trim()) return;
    setLinkLoading(true);
    setLinkResult(null);
    try {
      const res = await fetch('/api/admin/stripe/send-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: linkEmail.trim(), courseId, locale: linkLocale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLinkResult({ error: data.error });
      } else {
        setLinkResult({ success: true });
        setLinkEmail('');
      }
    } catch {
      setLinkResult({ error: 'Network error. Please try again.' });
    } finally {
      setLinkLoading(false);
    }
  }

  const enrolledSet = new Set(enrolledStudentIds);

  return (
    <div className="space-y-6">

      {/* ─── Send Payment Link ─── */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-fg-primary">Send Payment Link</h3>
          <p className="text-xs text-fg-tertiary">Email a Stripe checkout link (USD) directly to a registered user.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLinkLocale('en')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              linkLocale === 'en'
                ? 'bg-accent-teal/10 text-accent-teal'
                : 'bg-bg-tertiary text-fg-tertiary hover:text-fg-secondary'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLinkLocale('ja')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              linkLocale === 'ja'
                ? 'bg-accent-teal/10 text-accent-teal'
                : 'bg-bg-tertiary text-fg-tertiary hover:text-fg-secondary'
            }`}
          >
            日本語
          </button>
        </div>
        <form onSubmit={handleSendPaymentLink} className="flex gap-2">
          <Input
            type="email"
            value={linkEmail}
            onChange={(e) => { setLinkEmail(e.target.value); setLinkResult(null); }}
            placeholder="student@email.com"
            className="flex-1"
          />
          <Button variant="primary" size="sm" disabled={linkLoading || !linkEmail.trim()}>
            {linkLoading ? 'Sending...' : (
              <>
                <Send size={13} className="mr-1" />
                Send Link
              </>
            )}
          </Button>
        </form>
        {linkResult?.success && (
          <p className="text-xs text-accent-teal">
            Payment link sent successfully {linkLocale === 'ja' ? '(Japanese)' : '(English)'}.
          </p>
        )}
        {linkResult?.error && (
          <p className="text-xs text-red-400">{linkResult.error}</p>
        )}
      </div>

      {/* ─── Manual Enrollment (comp/free) ─── */}
      <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-fg-primary">Manual Enrollment</h3>
          <p className="text-xs text-fg-tertiary">Add users to this course (comp/scholarship — no payment).</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'search' ? 'uuid' : 'search');
            setFeedback(null);
          }}
          className="text-xs text-accent-teal hover:underline"
        >
          {mode === 'search' ? 'Enter UUID manually' : 'Back to search'}
        </button>
      </div>

      {mode === 'uuid' ? (
        <form onSubmit={handleUuidSubmit} className="flex gap-2">
          <Input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID (UUID)"
            className="flex-1"
          />
          <Button variant="primary" size="sm" disabled={uuidLoading || !userId.trim()}>
            {uuidLoading ? 'Enrolling...' : 'Enroll'}
          </Button>
          {uuidError && <p className="text-xs text-red-400 self-center">{uuidError}</p>}
          {uuidSuccess && <p className="text-xs text-accent-teal self-center">Enrolled!</p>}
        </form>
      ) : (
        <div className="space-y-3">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-tertiary" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-9"
            />
          </div>

          {/* Selected chips */}
          {selected.size > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Array.from(selected.values()).map(user => (
                <span
                  key={user.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-accent-teal/15 text-accent-teal border border-accent-teal/30"
                >
                  {user.full_name ?? user.email}
                  <button
                    type="button"
                    onClick={() => removeSelected(user.id)}
                    className="hover:text-fg-primary"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search results */}
          {searching && (
            <p className="text-xs text-fg-tertiary py-2">Searching...</p>
          )}

          {!searching && results.length > 0 && (
            <div className="border border-border-default rounded-lg overflow-hidden max-h-60 overflow-y-auto">
              {results.map(user => {
                const isEnrolled = enrolledSet.has(user.id);
                const isSelected = selected.has(user.id);

                return (
                  <button
                    key={user.id}
                    type="button"
                    disabled={isEnrolled}
                    onClick={() => toggleSelect(user)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors border-b border-border-default last:border-b-0 ${
                      isEnrolled
                        ? 'opacity-50 cursor-not-allowed'
                        : isSelected
                          ? 'bg-accent-teal/10'
                          : 'hover:bg-bg-tertiary'
                    }`}
                  >
                    {/* Avatar initial */}
                    <div className="w-7 h-7 rounded-full bg-bg-tertiary border border-border-default flex items-center justify-center text-xs font-medium text-fg-secondary shrink-0">
                      {(user.full_name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-fg-primary font-medium truncate">
                          {user.full_name ?? 'No name'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-fg-tertiary border border-border-default uppercase tracking-wider">
                          {user.role}
                        </span>
                      </div>
                      <p className="text-xs text-fg-tertiary truncate">{user.email}</p>
                    </div>

                    {/* Status */}
                    {isEnrolled ? (
                      <span className="text-xs text-fg-tertiary shrink-0">Already enrolled</span>
                    ) : (
                      <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${
                        isSelected
                          ? 'bg-accent-teal border-accent-teal text-white'
                          : 'border-border-default'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-xs text-fg-tertiary py-2">No users found.</p>
          )}

          {/* Enroll button */}
          {selected.size > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleBatchEnroll}
              disabled={enrolling}
              className="w-full flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {enrolling
                ? 'Enrolling...'
                : `Enroll ${selected.size} User${selected.size > 1 ? 's' : ''}`}
            </Button>
          )}

          {/* Feedback */}
          {feedback && (
            <div className="space-y-1">
              {feedback.enrolled.length > 0 && (
                <p className="text-xs text-accent-teal">
                  Enrolled: {feedback.enrolled.join(', ')}
                </p>
              )}
              {feedback.errors.length > 0 && (
                <div className="text-xs text-red-400">
                  {feedback.errors.map((e, i) => (
                    <p key={i}>{e.name}: {e.message}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
