'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { manualEnroll } from '@/lib/admin/actions';

type ManualEnrollFormProps = {
  courseId: string;
};

export function ManualEnrollForm({ courseId }: ManualEnrollFormProps) {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim()) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await manualEnroll(userId.trim(), courseId);
      setSuccess(true);
      setUserId('');
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll student');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-medium text-fg-primary">Manual Enrollment</h3>
      <p className="text-xs text-fg-tertiary">Add a student to this course (comp/scholarship — no payment).</p>
      <div className="flex gap-2">
        <Input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="User ID (UUID)"
          className="flex-1"
        />
        <Button
          variant="primary"
          size="sm"
          disabled={loading || !userId.trim()}
        >
          {loading ? 'Enrolling...' : 'Enroll'}
        </Button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {success && <p className="text-xs text-accent-teal">Student enrolled successfully!</p>}
    </form>
  );
}
