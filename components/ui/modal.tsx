'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { IconButton } from './icon-button';
import { X } from 'lucide-react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  ariaLabel?: string;
  size?: 'sm' | 'md';
};

export function Modal({ open, onClose, children, title, ariaLabel, size = 'sm' }: ModalProps) {
  // Scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[300] flex items-center justify-center p-5',
        'transition-all duration-[var(--duration-slow)]',
        open ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none',
      )}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        className={cn(
          'relative z-10 w-full rounded-2xl',
          'bg-bg-secondary border border-border-default',
          'shadow-lg p-6 md:p-8',
          'transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)]',
          open ? 'scale-100' : 'scale-95',
          size === 'sm' ? 'max-w-[420px]' : 'max-w-[540px]',
        )}
      >
        <IconButton
          icon={X}
          label="Close"
          onClick={onClose}
          className="absolute top-3 right-3"
        />

        {title && (
          <h2 className="font-serif text-h3 text-fg-primary mb-2">{title}</h2>
        )}

        {children}
      </div>
    </div>
  );
}
