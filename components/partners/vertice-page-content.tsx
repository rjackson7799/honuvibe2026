'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { Brain, MessageSquare, ImageIcon, Zap, Bot, Check } from 'lucide-react';
import { VerticeForm } from './vertice-form';
import { VerticeConfirmation } from './vertice-confirmation';
import { trackEvent } from '@/lib/analytics';

type ConfirmationData = {
  firstName: string;
  isReturning: boolean;
};

const WEEK_ICONS = [Brain, MessageSquare, ImageIcon, Zap, Bot] as const;
const WEEK_KEYS = ['week_1', 'week_2', 'week_3', 'week_4', 'week_5'] as const;
const BENEFIT_KEYS = ['workshops', 'bilingual', 'certificate'] as const;

export function VerticePageContent() {
  const t = useTranslations('vertice');
  const locale = useLocale();
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);

  useEffect(() => {
    trackEvent('vertice_page_view', { locale });
  }, [locale]);

  const handleSuccess = (data: ConfirmationData) => {
    setConfirmation(data);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* ─── Left Panel: Form / Confirmation ─── */}
      <div className="order-2 lg:order-1 lg:w-[55%] flex items-start lg:items-center justify-center px-5 py-12 sm:px-8 lg:px-12 xl:px-20 bg-bg-primary">
        <div className="w-full max-w-[520px]">
          {/* Co-branded header */}
          <div className="flex items-center gap-3 mb-8 justify-center lg:justify-start">
            <Image
              src="/images/partners/vertice-crest.webp"
              alt="Vertice Society"
              width={48}
              height={48}
              className="h-9 w-auto lg:h-12"
            />
            <span className="text-fg-tertiary text-lg font-light">&times;</span>
            <span className="text-lg lg:text-xl font-semibold text-fg-primary tracking-tight">
              HonuVibe<span className="text-accent-teal">.AI</span>
            </span>
          </div>

          <AnimatePresence mode="wait">
            {confirmation ? (
              <motion.div
                key="confirmation"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              >
                <VerticeConfirmation
                  firstName={confirmation.firstName}
                  isReturning={confirmation.isReturning}
                />
              </motion.div>
            ) : (
              <motion.div
                key="form"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Heading block */}
                <div className="mb-6 text-center lg:text-left">
                  <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-fg-primary leading-tight">
                    {t('heading')}
                  </h1>
                  <p className="mt-2 text-lg sm:text-xl text-fg-secondary font-light">
                    {t('subheading')}
                  </p>

                  {/* Gold divider ornament */}
                  <div className="flex items-center gap-3 mt-5 justify-center lg:justify-start">
                    <div className="h-px w-10 bg-accent-gold/40" />
                    <span className="text-accent-gold text-sm">&#10022;</span>
                    <div className="h-px w-10 bg-accent-gold/40" />
                  </div>

                  <p className="mt-5 text-sm font-medium text-accent-teal">
                    {t('program_label')}
                  </p>
                  <p className="text-sm text-fg-secondary">
                    {t('exclusive_label')}
                  </p>
                </div>

                {/* ─── Value Content: 5-Week Overview ─── */}
                <div className="mb-5 rounded-lg border border-border-secondary bg-bg-secondary p-4">
                  <h3 className="text-xs font-semibold text-fg-primary uppercase tracking-wider mb-3">
                    {t('overview_title')}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {WEEK_KEYS.map((key, i) => {
                      const Icon = WEEK_ICONS[i];
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-7 h-7 rounded bg-accent-teal-subtle flex items-center justify-center">
                            <Icon size={14} className="text-accent-teal" />
                          </div>
                          <span className="text-sm text-fg-secondary">
                            <span className="font-medium text-fg-primary">Week {i + 1}</span>
                            {' · '}
                            {t(key)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ─── Benefits ─── */}
                <div className="mb-5 flex flex-col sm:flex-row gap-2 sm:gap-4">
                  {BENEFIT_KEYS.map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <Check size={14} className="text-accent-teal flex-shrink-0" />
                      <span className="text-xs text-fg-secondary">
                        {t(`benefits.${key}`)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* ─── Endorsement ─── */}
                <p className="mb-6 text-xs text-fg-tertiary italic text-center lg:text-left">
                  {t('endorsement')}
                </p>

                <VerticeForm onSuccess={handleSuccess} />

                {/* Footer note */}
                <p className="mt-8 text-xs text-fg-tertiary text-center lg:text-left">
                  {t('footer_note')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Right Panel: Animated Ocean Gradient ─── */}
      <div className="order-1 lg:order-2 lg:w-[45%] h-[40vh] lg:h-auto relative overflow-hidden">
        {/* Animated ocean gradient */}
        <div
          className="absolute inset-0 motion-safe:animate-[oceanDrift_30s_ease-in-out_infinite]"
          style={{
            background: 'linear-gradient(135deg, #b8d8e8 0%, #8ec0d4 25%, #6ba8c0 50%, #a8c4d4 75%, #c8dce6 100%)',
            backgroundSize: '200% 200%',
          }}
        />

        {/* Subtle noise texture overlay for depth */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

        {/* Gradient overlay for smooth transition on mobile */}
        <div className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-l from-bg-primary/50 via-transparent to-transparent z-10 pointer-events-none" />
      </div>
    </div>
  );
}
