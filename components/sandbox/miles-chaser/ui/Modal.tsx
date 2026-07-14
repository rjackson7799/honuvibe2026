'use client';

// Ported from MilesChaser src/components/ui/Modal.tsx with dialog a11y the
// source lacked: role/aria-modal/labelledby, initial focus, focus trap, and
// focus return to the trigger on close.
import { useEffect, useCallback, useId, useRef, ReactNode } from 'react';
import Button from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmVariant?: 'primary' | 'danger';
  loading?: boolean;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  confirmVariant = 'primary',
  loading,
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // Minimal focus trap: keep Tab cycling inside the dialog.
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Initial focus moves into the dialog (its first focusable control).
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusables?.[0]?.focus();
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      // Focus returns to the trigger on close.
      previousFocusRef.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Content */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-xl"
      >
        <div className="p-6">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">{children}</div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {cancelLabel}
          </Button>
          {onConfirm && confirmLabel && (
            <Button variant={confirmVariant} size="sm" onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
