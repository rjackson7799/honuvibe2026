'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline, Button } from '@/components/ui';
import { Send } from 'lucide-react';
import { motion, useMotionValue, useMotionTemplate } from 'motion/react';

export function NewsletterSignup() {
  const t = useTranslations('newsletter');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isHovered, setIsHovered] = useState(false);
  // Spotlight mouse tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const spotlightBg = useMotionTemplate`
    radial-gradient(
      500px circle at ${mouseX}px ${mouseY}px,
      rgba(var(--accent-teal-rgb, 94, 170, 168), 0.1),
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
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <Section id="newsletter" className="dark-zone bg-[var(--bg-primary)]">
      <Container size="narrow">
        <div
          className="group relative overflow-hidden rounded-2xl glass-card p-8 md:p-12 text-center"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Mouse-tracking spotlight */}
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
            style={{
              background: spotlightBg,
              opacity: isHovered ? 1 : 0,
            }}
            aria-hidden="true"
          />

          {/* Content */}
          <div className="relative z-10">
            <Overline className="mb-4 block">{t('overline')}</Overline>
            <h2 className="font-serif text-h2 text-fg-primary mb-3">{t('heading')}</h2>
            <p className="text-base text-fg-secondary leading-relaxed mb-8 max-w-[460px] mx-auto">
              {t('description')}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:gap-0 max-w-[440px] mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('placeholder')}
                required
                className="h-12 flex-1 rounded sm:rounded-r-none bg-bg-tertiary px-4 text-[16px] text-fg-primary border border-border-default placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors duration-[var(--duration-fast)]"
              />
              <Button
                variant="gradient"
                size="md"
                type="submit"
                disabled={status === 'loading'}
                className="sm:rounded-l-none sm:border-l-0"
                icon={Send}
                iconPosition="right"
              >
                {t('cta')}
              </Button>
            </form>

            {status === 'success' && (
              <p className="mt-4 text-sm text-accent-teal">{t('success')}</p>
            )}
            {status === 'error' && (
              <p className="mt-4 text-sm text-red-400">{t('error')}</p>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
