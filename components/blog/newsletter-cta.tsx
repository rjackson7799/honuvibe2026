'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import { motion, useMotionValue, useMotionTemplate } from 'motion/react';

export function NewsletterCta() {
  const t = useTranslations('blog');
  const tNewsletter = useTranslations('newsletter');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isHovered, setIsHovered] = useState(false);

  // Spotlight mouse tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const spotlightBg = useMotionTemplate`
    radial-gradient(
      350px circle at ${mouseX}px ${mouseY}px,
      rgba(var(--accent-teal-rgb, 94, 170, 168), 0.07),
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
      className="group relative overflow-hidden rounded-lg bg-bg-secondary border border-border-default p-6 my-8"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Geometric faceted overlay */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 opacity-35"
          style={{
            background: 'linear-gradient(215deg, var(--bg-tertiary) 0%, transparent 60%)',
          }}
        />
        <div
          className="absolute top-0 -right-1/4 w-3/4 h-full opacity-25"
          style={{
            background: 'linear-gradient(145deg, var(--bg-secondary) 0%, transparent 50%)',
          }}
        />
      </div>

      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/5 via-transparent to-accent-gold/5 pointer-events-none rounded-lg" />

      {/* Mouse-tracking spotlight */}
      <motion.div
        className="absolute inset-0 rounded-lg pointer-events-none transition-opacity duration-300"
        style={{
          background: spotlightBg,
          opacity: isHovered ? 1 : 0,
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10">
        <h3 className="font-serif text-lg font-normal text-fg-primary mb-1">{t('newsletter_heading')}</h3>
        <p className="text-sm text-fg-secondary mb-4">{t('newsletter_sub')}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:gap-0">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={tNewsletter('placeholder')}
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
            {tNewsletter('cta')}
          </Button>
        </form>

        {status === 'success' && (
          <p className="mt-3 text-sm text-accent-teal">{tNewsletter('success')}</p>
        )}
        {status === 'error' && (
          <p className="mt-3 text-sm text-red-400">{tNewsletter('error')}</p>
        )}
      </div>
    </div>
  );
}
