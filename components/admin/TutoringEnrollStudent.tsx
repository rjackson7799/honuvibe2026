'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Loader2, UserPlus } from 'lucide-react';
import { manualEnroll, searchUsers } from '@/lib/admin/actions';

type SearchResult = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
};

/**
 * Inline "add an existing student" control for a 1v1 engagement. Searches
 * existing students by name/email (reusing searchUsers), then enrolls the
 * chosen one into this private course via manualEnroll — with the enrollment
 * email suppressed (the student is notified when the first report publishes).
 * Rendered only when the engagement has no active student (single seat).
 */
export function TutoringEnrollStudent({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, startTransition] = useTransition();
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchUsers(query.trim());
        // Only real students can be the tutee — never an admin/instructor.
        setResults((data as SearchResult[]).filter((u) => u.role === 'student'));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function enroll(user: SearchResult) {
    setError(null);
    setEnrollingId(user.id);
    startTransition(async () => {
      const result = await manualEnroll(user.id, courseId, '1v1 engagement', true, null);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
        setEnrollingId(null);
      }
    });
  }

  return (
    <div className="w-full max-w-xl space-y-3 rounded-xl border border-border-default bg-bg-secondary p-5">
      <div className="space-y-1">
        <h2 className="text-[15px] font-semibold text-fg-primary">Add the student</h2>
        <p className="text-[13px] text-fg-tertiary">
          Search an existing student by name or email to enroll them in this engagement. They
          won&apos;t get an enrollment email — they&apos;re notified when the first report is
          published.
        </p>
      </div>

      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search students…"
          className="w-full rounded-lg border border-border-default bg-bg-primary py-2 pl-9 pr-3 text-[14px] text-fg-primary"
          autoFocus
        />
        {searching && (
          <Loader2
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-fg-tertiary"
          />
        )}
      </div>

      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <p className="text-[13px] text-fg-tertiary">No matching students.</p>
      )}

      {results.length > 0 && (
        <ul className="divide-y divide-border-default overflow-hidden rounded-lg border border-border-default">
          {results.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => enroll(u)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-bg-tertiary/50 disabled:opacity-60"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium text-fg-primary">
                    {u.full_name ?? '(no name)'}
                  </span>
                  <span className="block truncate text-[12px] text-fg-tertiary">{u.email}</span>
                </span>
                {enrollingId === u.id && pending ? (
                  <Loader2 size={15} className="shrink-0 animate-spin text-accent-teal" />
                ) : (
                  <UserPlus size={15} className="shrink-0 text-fg-tertiary" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-[13px] text-red-600">{error}</p>}

      <p className="text-[12px] text-fg-tertiary">
        New to the platform?{' '}
        <Link href="/admin/students/new" className="text-accent-teal hover:underline">
          Onboard a brand-new student →
        </Link>
      </p>
    </div>
  );
}
