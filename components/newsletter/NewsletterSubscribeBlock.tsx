'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import { motion, useMotionValue, useMotionTemplate, useReducedMotion } from 'motion/react';

type NewsletterSubscribeBlockProps = {
  locale: string;
  sourcePage: string;
};

export function NewsletterSubscribeBlock({ locale, sourcePage }: NewsletterSubscribeBlockProps) {
  const t = useTranslations('newsletter');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Spotlight mouse tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const spotlightBg = useMotionTemplate`
    radial-gradient(
      400px circle at ${mouseX}px ${mouseY}px,
      rgba(var(--accent-teal-rgb, 94, 170, 168), 0.08),
      transparent 80%
    )
  `;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const { left, top } = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - left);
      mouseY.set(e.clientY - top);
    },
    [mouseX, mouseY]
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
        trackEvent('newsletter_subscribe', { source_page: sourcePage, locale });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div
      className="group relative overflow-hidden bg-bg-secondary border border-border-default rounded-lg p-6 md:p-8 max-w-[600px] mx-auto text-center"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Layer 1: Geometric faceted overlay */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 opacity-40"
          style={{
            background: 'linear-gradient(215deg, var(--bg-tertiary) 0%, transparent 60%)',
          }}
        />
        <div
          className="absolute top-0 -right-1/4 w-3/4 h-full opacity-30"
          style={{
            background: 'linear-gradient(145deg, var(--bg-secondary) 0%, transparent 50%)',
          }}
        />
        <div
          className="absolute -bottom-1/4 -left-1/6 w-2/3 h-2/3 opacity-25"
          style={{
            background: 'linear-gradient(320deg, var(--bg-tertiary) 0%, transparent 55%)',
          }}
        />
      </div>

      {/* Layer 2: Original decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/5 via-transparent to-accent-gold/5 pointer-events-none rounded-lg" />

      {/* Layer 3: Mouse-tracking spotlight */}
      <motion.div
        className="absolute inset-0 rounded-lg pointer-events-none transition-opacity duration-300"
        style={{
          background: spotlightBg,
          opacity: isHovered ? 1 : 0,
        }}
        aria-hidden="true"
      />

      {/* Layer 4: Animated wave SVGs at bottom */}
      {!prefersReducedMotion && (
        <div className="absolute bottom-0 left-0 right-0 h-28 opacity-15 pointer-events-none overflow-hidden" aria-hidden="true">
          <motion.div
            className="absolute bottom-0 left-0 w-[200%] h-full flex items-end"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            <svg
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
              className="w-full h-full"
              style={{ fill: 'var(--accent-teal)', opacity: 0.35 }}
            >
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.08,130.83,120.22,192,108.57,236.4,100.12,279.17,79.54,321.39,56.44Z" />
            </svg>
          </motion.div>
          <motion.div
            className="absolute bottom-0 left-0 w-[200%] h-full flex items-end"
            animate={{ x: ['-50%', '0%'] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          >
            <svg
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
              className="w-full h-full"
              style={{ fill: 'var(--accent-teal)', opacity: 0.2 }}
            >
              <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" />
            </svg>
          </motion.div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        <h3 className="font-serif text-lg font-normal text-fg-primary">
          {t('subscribe_heading')}
        </h3>
        <p className="text-sm text-fg-secondary mt-2">
          {t('subscribe_sub')}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:gap-0 mt-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('subscribe_placeholder')}
            required
            className="h-11 flex-1 rounded sm:rounded-r-none bg-bg-tertiary px-4 text-[16px] text-fg-primary border border-border-default placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors duration-[var(--duration-fast)]"
          />
          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={status === 'loading'}
            className="sm:rounded-l-none sm:border-l-0"
            icon={Send}
            iconPosition="right"
          >
            {t('subscribe_button')}
          </Button>
        </form>

        {status === 'success' && (
          <p className="mt-3 text-sm text-accent-teal">{t('success')}</p>
        )}
        {status === 'error' && (
          <p className="mt-3 text-sm text-red-400">{t('error')}</p>
        )}
      </div>
    </div>
  );
}
