'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { createTutoringCourse } from '@/lib/tutoring/actions';

type TeacherOption = { id: string; name: string };

type NewTutoringEngagementProps = {
  options: TeacherOption[];
};

export function NewTutoringEngagement({ options }: NewTutoringEngagementProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [titleEn, setTitleEn] = useState('');
  const [titleJp, setTitleJp] = useState('');
  const [instructorProfileId, setInstructorProfileId] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-accent-teal px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
      >
        <Plus size={15} /> New engagement
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          try {
            const { courseId } = await createTutoringCourse({
              titleEn,
              titleJp: titleJp.trim() || null,
              instructorProfileId: instructorProfileId || null,
            });
            router.push(`/admin/tutoring/${courseId}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create the engagement.');
          }
        });
      }}
      className="w-full max-w-xl space-y-3 rounded-xl border border-border-default bg-bg-secondary p-5"
    >
      <h2 className="text-[15px] font-semibold text-fg-primary">New 1-on-1 engagement</h2>
      <p className="text-[13px] text-fg-tertiary">
        Creates a private, published course (max 1 seat). You&apos;ll add the student on the next
        screen.
      </p>

      <label className="block text-[13px]">
        <span className="mb-1 block font-medium text-fg-secondary">Title (EN)</span>
        <input
          type="text"
          value={titleEn}
          onChange={(e) => setTitleEn(e.target.value)}
          placeholder="e.g. 1-on-1 English with Shiori"
          className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-fg-primary"
          required
          autoFocus
        />
      </label>

      <label className="block text-[13px]">
        <span className="mb-1 block font-medium text-fg-secondary">
          Title (JP) <span className="text-fg-tertiary">(optional)</span>
        </span>
        <input
          type="text"
          value={titleJp}
          onChange={(e) => setTitleJp(e.target.value)}
          placeholder="例: しおりさんの1対1英語レッスン"
          className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-fg-primary"
        />
      </label>

      {options.length > 0 && (
        <label className="block text-[13px]">
          <span className="mb-1 block font-medium text-fg-secondary">
            Teacher <span className="text-fg-tertiary">(optional)</span>
          </span>
          <select
            value={instructorProfileId}
            onChange={(e) => setInstructorProfileId(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-fg-primary"
          >
            <option value="">Unassigned</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="text-[13px] text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending || titleEn.trim() === ''}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent-teal px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? <Loader2 size={15} className="animate-spin" /> : null}
          {pending ? 'Creating…' : 'Create engagement'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-2 text-[13px] text-fg-tertiary hover:text-fg-primary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
