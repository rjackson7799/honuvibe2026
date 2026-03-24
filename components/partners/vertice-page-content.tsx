'use client';

import { useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { Sparkles, Wand2, Users, Cpu, Map, Check, FileText, BookOpen, Award, Globe2, Wrench, ArrowRight } from 'lucide-react';
import { VerticeEnrollPanel } from './vertice-enroll-panel';
import { trackEvent } from '@/lib/analytics';
import { TechIcon } from '@/components/sections/exploration/tech-icon';
import { VerticeTeacherProfiles } from './vertice-teacher-profiles';

const WEEK_ICONS = [Sparkles, Wand2, Users, Cpu, Map] as const;
const WEEK_KEYS = ['week_1', 'week_2', 'week_3', 'week_4', 'week_5'] as const;
const WEEK_BULLETS = [
  ['week_1_bullet_1', 'week_1_bullet_2', 'week_1_bullet_3'],
  ['week_2_bullet_1', 'week_2_bullet_2', 'week_2_bullet_3'],
  ['week_3_bullet_1', 'week_3_bullet_2', 'week_3_bullet_3'],
  ['week_4_bullet_1', 'week_4_bullet_2', 'week_4_bullet_3'],
  ['week_5_bullet_1', 'week_5_bullet_2', 'week_5_bullet_3'],
] as const;
const DIFFERENTIATOR_KEYS = ['diff_1', 'diff_2', 'diff_3'] as const;
const BENEFIT_KEYS = ['workshops', 'bilingual', 'certificate'] as const;
const TAKEAWAY_KEYS = ['takeaway_1', 'takeaway_2', 'takeaway_3', 'takeaway_4', 'takeaway_5'] as const;
const DETAIL_ITEMS = [
  'course_code', 'duration', 'format',
  'session', 'weekly', 'language',
  'capacity', 'fee', 'platform',
] as const;
const INCLUDED_GROUPS = [
  { titleKey: 'materials_title', icon: BookOpen, items: ['materials_1', 'materials_2', 'materials_3'] },
  { titleKey: 'esl_title', icon: Globe2, items: ['esl_1', 'esl_2', 'esl_3'] },
  { titleKey: 'toolkit_title', icon: Wrench, items: ['toolkit_1', 'toolkit_2'] },
  { titleKey: 'community_title', icon: Award, items: ['community_1', 'community_2', 'community_3'] },
] as const;

// Display names for AI tool icons
const TECH_LABELS: Record<string, string> = {
  openai: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
};

// AI tool floating icons for right panel
const FLOATING_ICONS = [
  { key: 'openai', color: '#475569', top: '4%', left: '8%', duration: 4.2, delay: 0, size: 44 },
  { key: 'claude', color: '#b45309', top: '5%', left: '68%', duration: 5.0, delay: 0.3, size: 46 },
  { key: 'gemini', color: '#1d4ed8', top: '14%', left: '38%', duration: 4.6, delay: 0.7, size: 40 },
  { key: 'perplexity', color: '#0891b2', top: '22%', left: '6%', duration: 3.8, delay: 0.5, size: 44 },
  { key: 'openai', color: '#475569', top: '20%', left: '74%', duration: 4.4, delay: 1.0, size: 42 },
  { key: 'claude', color: '#b45309', top: '36%', left: '70%', duration: 5.2, delay: 0.2, size: 40 },
  { key: 'gemini', color: '#1d4ed8', top: '35%', left: '4%', duration: 4.8, delay: 0.8, size: 42 },
  { key: 'perplexity', color: '#0891b2', top: '50%', left: '12%', duration: 4.0, delay: 0.45, size: 42 },
  { key: 'openai', color: '#475569', top: '52%', left: '76%', duration: 3.6, delay: 1.1, size: 40 },
  { key: 'claude', color: '#b45309', top: '67%', left: '6%', duration: 4.3, delay: 0.35, size: 42 },
  { key: 'gemini', color: '#1d4ed8', top: '69%', left: '66%', duration: 4.9, delay: 0.9, size: 44 },
  { key: 'perplexity', color: '#0891b2', top: '81%', left: '38%', duration: 3.9, delay: 0.15, size: 40 },
  { key: 'openai', color: '#475569', top: '84%', left: '74%', duration: 4.7, delay: 0.55, size: 38 },
  { key: 'claude', color: '#b45309', top: '87%', left: '10%', duration: 5.1, delay: 1.2, size: 42 },
  { key: 'gemini', color: '#1d4ed8', top: '94%', left: '52%', duration: 4.1, delay: 0.75, size: 40 },
];

export function VerticePageContent() {
  const t = useTranslations('vertice');
  const locale = useLocale();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    trackEvent('vertice_page_view', { locale });
  }, [locale]);

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

          {/* ─── Why This Course Is Different ─── */}
          <div className="mb-5 flex flex-col gap-3">
            {DIFFERENTIATOR_KEYS.map((key) => (
              <div key={key} className="flex items-start gap-2.5">
                <span className="text-accent-gold text-xs mt-0.5 flex-shrink-0">&#10022;</span>
                <div>
                  <span className="text-sm font-semibold text-fg-primary">
                    {t(`differentiators.${key}_title`)}
                  </span>
                  <span className="text-sm text-fg-tertiary">
                    {' — '}{t(`differentiators.${key}_desc`)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ─── Value Content: Week Overview ─── */}
          <div className="mb-5 rounded-lg border border-border-secondary bg-bg-secondary p-4">
            <h3 className="text-xs font-semibold text-fg-primary uppercase tracking-wider mb-3">
              {t('overview_title')}
            </h3>
            <div className="flex flex-col gap-3">
              {WEEK_KEYS.map((key, i) => {
                const Icon = WEEK_ICONS[i];
                return (
                  <div key={key}>
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded bg-accent-teal-subtle flex items-center justify-center">
                        <Icon size={14} className="text-accent-teal" />
                      </div>
                      <span className="text-sm text-fg-secondary">
                        <span className="font-medium text-fg-primary">{t('week_label', { number: i + 1 })}</span>
                        {' · '}
                        {t(key)}
                      </span>
                    </div>
                    <div className="ml-10 mt-1.5 flex flex-col gap-1">
                      {WEEK_BULLETS[i].map((bulletKey) => (
                        <div key={bulletKey} className="flex items-start gap-2">
                          <span className="text-fg-tertiary text-[10px] mt-1 flex-shrink-0">•</span>
                          <span className="text-xs text-fg-tertiary leading-relaxed">{t(bulletKey)}</span>
                        </div>
                      ))}
                    </div>
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

          {/* ─── Course Details ─── */}
          <div className="mb-5 rounded-lg border border-border-secondary bg-bg-secondary p-4">
            <h3 className="text-xs font-semibold text-fg-primary uppercase tracking-wider mb-3">
              {t('details.section_title')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
              {DETAIL_ITEMS.map((key) => (
                <div key={key}>
                  <p className="text-[10px] text-fg-tertiary uppercase tracking-wider">{t(`details.${key}_label`)}</p>
                  <p className="text-xs text-fg-primary font-medium">{t(`details.${key}_value`)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Instructor Profiles ─── */}
          <div className="mb-5">
            <h3 className="text-xs font-semibold text-fg-primary uppercase tracking-wider mb-4">
              {t('instructors.section_title')}
            </h3>
            <VerticeTeacherProfiles />
          </div>

          {/* ─── What's Included ─── */}
          <div className="mb-5 rounded-lg border border-border-secondary bg-bg-secondary p-4">
            <h3 className="text-xs font-semibold text-fg-primary uppercase tracking-wider mb-3">
              {t('included.section_title')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {INCLUDED_GROUPS.map(({ titleKey, icon: GroupIcon, items }) => (
                <div key={titleKey}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <GroupIcon size={13} className="text-accent-teal flex-shrink-0" />
                    <p className="text-xs font-semibold text-fg-primary">{t(`included.${titleKey}`)}</p>
                  </div>
                  <div className="flex flex-col gap-1 ml-5">
                    {items.map((itemKey) => (
                      <p key={itemKey} className="text-xs text-fg-tertiary leading-relaxed">{t(`included.${itemKey}`)}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Endorsement ─── */}
          <p className="mb-6 text-xs text-fg-tertiary italic text-center lg:text-left">
            {t('endorsement')}
          </p>

          <VerticeEnrollPanel />

          {/* Footer note */}
          <p className="mt-8 text-xs text-fg-tertiary text-center lg:text-left">
            {t('footer_note')}
          </p>
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

          {/* Layer 2: Floating AI tool icons with labels */}
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

        {/* Mobile course cover + CTA overlay */}
        <div className="flex lg:hidden absolute inset-0 z-[2] flex-col items-center justify-end px-6 pb-6 gap-2">
          <Image
            src="/images/partners/course_cover.jpg"
            alt={t('right_panel.preview_label')}
            width={300}
            height={200}
            className="rounded-lg max-h-[22vh] w-full object-cover"
            style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1)' }}
          />
          <div className="w-full max-w-[300px] flex gap-1.5">
            <a
              href="/downloads/AI_Essentials_Syllabus_EN_1.0.pdf"
              download
              className="flex items-center justify-center gap-1 h-8 flex-1 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30 text-[11px] font-medium text-slate-700"
            >
              <FileText size={11} className="text-slate-500" />
              {t('syllabus.en_label')}
            </a>
            <a
              href="/downloads/AI_Essentials_Syllabus_JP_1.0.pdf"
              download
              className="flex items-center justify-center gap-1 h-8 flex-1 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30 text-[11px] font-medium text-slate-700"
            >
              <FileText size={11} className="text-slate-500" />
              {t('syllabus.jp_label')}
            </a>
          </div>
        </div>

        {/* Layer 3: Content overlay (desktop only) */}
        <div className="hidden lg:flex relative z-[2] h-full items-center justify-center px-5 xl:px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="w-full max-w-[380px] flex flex-col items-center gap-3"
          >
            {/* Course cover image — constrained to viewport height */}
            <Image
              src="/images/partners/course_cover.jpg"
              alt={t('right_panel.preview_label')}
              width={380}
              height={260}
              className="rounded-xl w-full max-h-[42vh] object-cover"
              style={{ boxShadow: '0 16px 40px rgba(0,0,0,0.22), 0 6px 16px rgba(0,0,0,0.1)' }}
            />

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

            {/* Syllabus downloads */}
            <div className="w-full flex gap-2">
              <a
                href="/downloads/AI_Essentials_Syllabus_EN_1.0.pdf"
                download
                onClick={() => trackEvent('syllabus_download', { locale, lang: 'en' })}
                className="flex items-center justify-center gap-1.5 h-9 flex-1 rounded-lg bg-white/50 backdrop-blur-sm border border-white/40 text-[12px] font-medium text-slate-700 hover:bg-white/70 transition-colors"
              >
                <FileText size={13} className="text-slate-500 flex-shrink-0" />
                {t('syllabus.en_label')}
              </a>
              <a
                href="/downloads/AI_Essentials_Syllabus_JP_1.0.pdf"
                download
                onClick={() => trackEvent('syllabus_download', { locale, lang: 'jp' })}
                className="flex items-center justify-center gap-1.5 h-9 flex-1 rounded-lg bg-white/50 backdrop-blur-sm border border-white/40 text-[12px] font-medium text-slate-700 hover:bg-white/70 transition-colors"
              >
                <FileText size={13} className="text-slate-500 flex-shrink-0" />
                {t('syllabus.jp_label')}
              </a>
            </div>

            {/* Register CTA */}
            <a
              href="#enroll"
              onClick={() => trackEvent('vertice_register_cta_click', { locale })}
              className="w-full h-12 rounded-xl bg-accent-teal text-white font-semibold text-base flex items-center justify-center gap-2 hover:brightness-110 shadow-lg transition-all duration-[var(--duration-normal)]"
            >
              {t('right_panel.register_cta')}
              <ArrowRight size={18} />
            </a>
            <p className="text-[11px] text-slate-500 font-medium tracking-wide text-center">
              {t('right_panel.spots_left')}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
