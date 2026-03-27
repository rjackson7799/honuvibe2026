'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { deleteStudent } from '@/lib/admin/actions';

export function DeleteStudentButton({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteStudent(studentId);
        router.push('/admin/students');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete student');
        setShowConfirm(false);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
      >
        <Trash2 size={15} />
        Delete Account
      </button>

      {error && (
        <p className="text-sm text-red-400 mt-2">{error}</p>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-bg-secondary border border-border-default rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-lg font-semibold text-fg-primary">
              Delete Student Account
            </h3>
            <p className="text-sm text-fg-secondary">
              Are you sure you want to permanently delete{' '}
              <span className="font-medium text-fg-primary">{studentName}</span>?
              This will remove their account, all enrollments, and cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm text-fg-secondary hover:text-fg-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isPending ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
