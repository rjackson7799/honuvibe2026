'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Brain, MessageSquare, ImageIcon, Zap, Bot, Check } from 'lucide-react';
import { VerticeForm } from './vertice-form';
import { VerticeConfirmation } from './vertice-confirmation';
import { trackEvent } from '@/lib/analytics';
import { TechIcon } from '@/components/sections/exploration/tech-icon';

type ConfirmationData = {
  firstName: string;
  isReturning: boolean;
};

const WEEK_ICONS = [Brain, MessageSquare, ImageIcon, Zap, Bot] as const;
const WEEK_KEYS = ['week_1', 'week_2', 'week_3', 'week_4', 'week_5'] as const;
const BENEFIT_KEYS = ['workshops', 'bilingual', 'certificate'] as const;
const TAKEAWAY_KEYS = ['takeaway_1', 'takeaway_2', 'takeaway_3', 'takeaway_4', 'takeaway_5'] as const;

// Display names for tech icons
const TECH_LABELS: Record<string, string> = {
  react: 'React', nextjs: 'Next.js', typescript: 'TypeScript', tailwind: 'Tailwind',
  claude: 'Claude', openai: 'OpenAI', supabase: 'Supabase', stripe: 'Stripe',
  cursor: 'Cursor', vercel: 'Vercel', figma: 'Figma', lovable: 'Lovable', nodejs: 'Node.js',
};

// Curated tech icons — light-mode colors, larger sizes with labels
const FLOATING_ICONS = [
  // Row 1: top area
  { key: 'react', color: '#0e7490', top: '3%', left: '8%', duration: 4.2, delay: 0, size: 42 },
  { key: 'claude', color: '#b45309', top: '4%', left: '70%', duration: 5.0, delay: 0.3, size: 46 },
  { key: 'nextjs', color: '#334155', top: '11%', left: '38%', duration: 4.6, delay: 0.7, size: 40 },
  // Row 2: upper-mid
  { key: 'typescript', color: '#1d4ed8', top: '21%', left: '6%', duration: 3.8, delay: 0.5, size: 44 },
  { key: 'openai', color: '#475569', top: '19%', left: '75%', duration: 4.4, delay: 1.0, size: 42 },
  // Row 3: middle
  { key: 'tailwind', color: '#0891b2', top: '36%', left: '70%', duration: 5.2, delay: 0.2, size: 40 },
  { key: 'supabase', color: '#059669', top: '34%', left: '4%', duration: 4.8, delay: 0.8, size: 44 },
  // Row 4: lower-mid
  { key: 'stripe', color: '#7c3aed', top: '50%', left: '12%', duration: 4.0, delay: 0.45, size: 42 },
  { key: 'cursor', color: '#0e7490', top: '53%', left: '78%', duration: 3.6, delay: 1.1, size: 40 },
  { key: 'vercel', color: '#1e293b', top: '48%', left: '42%', duration: 5.4, delay: 0.6, size: 38 },
  // Row 5: lower
  { key: 'figma', color: '#c2410c', top: '66%', left: '6%', duration: 4.3, delay: 0.35, size: 42 },
  { key: 'lovable', color: '#be185d', top: '68%', left: '68%', duration: 4.9, delay: 0.9, size: 44 },
  // Row 6: bottom
  { key: 'nodejs', color: '#15803d', top: '80%', left: '38%', duration: 3.9, delay: 0.15, size: 40 },
  { key: 'react', color: '#0e7490', top: '83%', left: '74%', duration: 4.7, delay: 0.55, size: 38 },
  { key: 'claude', color: '#b45309', top: '86%', left: '10%', duration: 5.1, delay: 1.2, size: 42 },
  // Row 7: very bottom
  { key: 'typescript', color: '#1d4ed8', top: '94%', left: '52%', duration: 4.1, delay: 0.75, size: 40 },
] as const;

export function VerticePageContent() {
  const t = useTranslations('vertice');
  const locale = useLocale();
  const prefersReducedMotion = useReducedMotion();
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);

  useEffect(() => {
    trackEvent('vertice_page_view', { locale });
  }, [locale]);

  const handleSuccess = (data: ConfirmationData) => {
    setConfirmation(data);
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-start min-h-screen">
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

      {/* ─── Right Panel: Floating Icons + Course Preview ─── */}
      <div className="order-1 lg:order-2 lg:w-[45%] h-[40vh] lg:h-screen lg:sticky lg:top-0 relative overflow-clip">
        {/* Decorative background — clipped so floating icons don't leak */}
        <div className="absolute inset-0 overflow-clip">
          {/* Layer 1: Animated ocean gradient background */}
          <div
            className="absolute inset-0 motion-safe:animate-[oceanDrift_30s_ease-in-out_infinite]"
            style={{
              background: 'linear-gradient(135deg, #b8d8e8 0%, #8ec0d4 25%, #6ba8c0 50%, #a8c4d4 75%, #c8dce6 100%)',
              backgroundSize: '200% 200%',
            }}
          />

          {/* Subtle noise texture overlay for depth */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

          {/* Layer 2: Floating tech icons with labels — spread across full height */}
          {FLOATING_ICONS.map(({ key, color, top, left, duration, delay, size }, i) => (
            <motion.div
              key={`${key}-${i}`}
              className="absolute z-[1] flex flex-col items-center"
              style={{ top, left }}
              animate={prefersReducedMotion ? {} : { y: [0, -14, 0] }}
              transition={{
                duration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay,
              }}
            >
              <div
                className="flex items-center justify-center opacity-[0.4]"
                style={{ color, filter: `drop-shadow(0 0 10px ${color}50)`, width: size, height: size }}
              >
                <TechIcon name={key} size={size} />
              </div>
              <span
                className="mt-1 text-[9px] font-semibold tracking-[0.12em] uppercase whitespace-nowrap opacity-[0.35]"
                style={{ color }}
              >
                {TECH_LABELS[key] ?? key}
              </span>
            </motion.div>
          ))}

          {/* Gradient overlay for smooth transition on mobile */}
          <div className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-l from-bg-primary/50 via-transparent to-transparent z-10 pointer-events-none" />
        </div>

        {/* Layer 3: Content overlay (desktop only) */}
        <div className="hidden lg:flex relative z-[2] h-full items-center justify-center px-6 xl:px-10 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="w-full max-w-[300px] flex flex-col items-center gap-3"
          >
            {/* Course cover image — constrained to ~40% of viewport height */}
            <Image
              src="/images/partners/course_cover.jpg"
              alt={t('right_panel.preview_label')}
              width={300}
              height={200}
              className="rounded-xl w-full max-h-[38vh] object-cover"
              style={{ boxShadow: '0 16px 40px rgba(0,0,0,0.22), 0 6px 16px rgba(0,0,0,0.1)' }}
            />

            {/* CTA + privacy note */}
            <div className="bg-white/70 backdrop-blur-sm rounded-lg px-4 py-2.5 text-center w-full">
              <p className="text-[12.5px] text-slate-700 leading-snug font-medium">
                {t('right_panel.cta_prompt')}
              </p>
              <p className="text-[10.5px] text-slate-500 leading-snug mt-0.5">
                {t('right_panel.privacy_note')}
              </p>
            </div>

            {/* Key takeaways */}
            <div className="w-full bg-white/60 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg border border-white/40">
              <h3 className="text-[13px] font-semibold text-slate-800 uppercase tracking-wider mb-2">
                {t('right_panel.takeaways_title')}
              </h3>
              <div className="flex flex-col gap-1">
                {TAKEAWAY_KEYS.map((key) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="text-accent-gold text-[11px] mt-0.5 flex-shrink-0">&#10022;</span>
                    <span className="text-[12px] text-slate-700 leading-snug">
                      {t(`right_panel.${key}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
