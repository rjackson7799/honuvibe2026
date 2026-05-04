'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { trackEvent } from '@/lib/analytics';
import { motion, useMotionValue, useMotionTemplate } from 'motion/react';
import { cn } from '@/lib/utils';

export function NewsletterCta() {
  const t = useTranslations('blog');
  const tNewsletter = useTranslations('newsletter');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const spotlightBg = useMotionTemplate`
    radial-gradient(
      350px circle at ${mouseX}px ${mouseY}px,
      rgba(15, 169, 160, 0.10),
      transparent 80%
    )
  `;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const { left, top } = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - left);
      mouseY.set(e.clientY - top);
    },
    [mouseX, mouseY],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus('success');
        setEmail('');
        trackEvent('newsletter_signup', { source_page: 'blog_post' });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden my-10 p-5 sm:p-7',
        'rounded-[var(--m-radius-xl)]',
        'border border-[var(--m-border-soft)]',
        'bg-[linear-gradient(135deg,rgba(15,169,160,0.05)_0%,var(--m-sand)_55%,rgba(232,118,90,0.05)_100%)]',
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: spotlightBg,
          opacity: isHovered ? 1 : 0,
        }}
        aria-hidden="true"
      />

      <div className="relative z-10">
        <h3 className="font-bold text-[20px] leading-[1.25] text-[var(--m-ink-primary)] mb-1.5">
          {t('newsletter_heading')}
        </h3>
        <p className="text-[14px] text-[var(--m-ink-secondary)] mb-5">
          {t('newsletter_sub')}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={tNewsletter('placeholder')}
            required
            className={cn(
              'h-12 flex-1 rounded-[10px] px-4 text-[15px]',
              'border-[1.5px] border-[var(--m-border-strong)] bg-[var(--m-white)]',
              'text-[var(--m-ink-primary)] placeholder:text-[var(--m-ink-tertiary)]',
              'outline-none transition-colors',
              'focus:border-[var(--m-accent-teal)] focus:ring-2 focus:ring-[var(--m-accent-teal-soft)]',
            )}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className={cn(
              'shrink-0 rounded-[10px] px-6 py-3 text-[15px] font-bold',
              'bg-[var(--m-accent-teal)] text-white',
              'shadow-[var(--m-shadow-teal-sm)]',
              'transition-all duration-200',
              'hover:bg-[var(--m-accent-teal-dark)] hover:shadow-[var(--m-shadow-teal-md)]',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            {tNewsletter('cta')}
          </button>
        </form>

        {status === 'success' && (
          <p className="mt-3 text-[14px] font-medium text-[var(--m-accent-teal-dark)]">
            {tNewsletter('success')}
          </p>
        )}
        {status === 'error' && (
          <p className="mt-3 text-[14px] font-medium text-[var(--m-accent-coral-dark)]">
            {tNewsletter('error')}
          </p>
        )}
      </div>
    </div>
  );
}
