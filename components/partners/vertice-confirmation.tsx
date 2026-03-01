'use client';

import { useTranslations, useLocale } from 'next-intl';
import { CheckCircle, FileText, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { trackEvent } from '@/lib/analytics';

type VerticeConfirmationProps = {
  firstName: string;
  isReturning: boolean;
};

const DOWNLOADS = {
  en: '/downloads/Vertice_Honu_AI_Mastery_Course_EN.pdf',
  ja: '/downloads/Vertice_Honu_AI_Mastery_Course_JP.pdf',
} as const;

export function VerticeConfirmation({
  firstName,
  isReturning,
}: VerticeConfirmationProps) {
  const t = useTranslations('vertice');
  const locale = useLocale();

  const handleDownload = (lang: 'en' | 'ja') => {
    trackEvent('vertice_pdf_download', { locale, pdf_lang: lang });
  };

  return (
    <div className="text-center lg:text-left">
      {/* Checkmark */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="flex justify-center lg:justify-start mb-4"
      >
        <CheckCircle size={48} className="text-green-500" strokeWidth={1.5} />
      </motion.div>

      {/* Title */}
      <h2 className="font-serif text-3xl sm:text-4xl text-fg-primary mb-2">
        {t('confirmation.title')}
      </h2>

      {/* Personalized greeting */}
      <p className="text-lg text-fg-secondary mb-1">
        {t('confirmation.greeting', { firstName })}
      </p>
      <p className="text-lg text-fg-secondary">
        {t('confirmation.welcome')}
      </p>

      {/* Returning user notice */}
      {isReturning && (
        <p className="mt-3 text-sm text-accent-teal font-medium">
          {t('confirmation.returning_user')}
        </p>
      )}

      {/* Gold divider */}
      <div className="flex items-center gap-3 my-6 justify-center lg:justify-start">
        <div className="h-px w-10 bg-accent-gold/40" />
        <span className="text-accent-gold text-sm">&#10022;</span>
        <div className="h-px w-10 bg-accent-gold/40" />
      </div>

      {/* Download label */}
      <p className="text-sm text-fg-secondary mb-4">
        {t('confirmation.download_label')}
      </p>

      {/* Download cards — EN and JP */}
      <div className="flex flex-col gap-3">
        {/* English PDF */}
        <div className="rounded-lg border border-border-accent bg-bg-secondary p-4 shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent-teal-subtle flex items-center justify-center">
              <FileText size={20} className="text-accent-teal" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-fg-primary">
                {t('confirmation.file_title_en')}
              </p>
              <p className="text-xs text-fg-tertiary mt-0.5">
                {t('confirmation.file_info')}
              </p>
            </div>
            <a
              href={DOWNLOADS.en}
              download
              onClick={() => handleDownload('en')}
              className="flex-shrink-0 h-9 px-4 rounded-lg bg-accent-teal text-white text-sm font-medium flex items-center gap-1.5 hover:bg-accent-teal-hover transition-colors duration-[var(--duration-fast)]"
            >
              <Download size={14} />
              {t('confirmation.download_button')}
            </a>
          </div>
        </div>

        {/* Japanese PDF */}
        <div className="rounded-lg border border-border-accent bg-bg-secondary p-4 shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent-teal-subtle flex items-center justify-center">
              <FileText size={20} className="text-accent-teal" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-fg-primary">
                {t('confirmation.file_title_jp')}
              </p>
              <p className="text-xs text-fg-tertiary mt-0.5">
                {t('confirmation.file_info')}
              </p>
            </div>
            <a
              href={DOWNLOADS.ja}
              download
              onClick={() => handleDownload('ja')}
              className="flex-shrink-0 h-9 px-4 rounded-lg bg-accent-teal text-white text-sm font-medium flex items-center gap-1.5 hover:bg-accent-teal-hover transition-colors duration-[var(--duration-fast)]"
            >
              <Download size={14} />
              {t('confirmation.download_button')}
            </a>
          </div>
        </div>
      </div>

      {/* Follow-up text */}
      <p className="mt-6 text-sm text-fg-secondary leading-relaxed">
        {t('confirmation.followup')}
      </p>

      {/* Contact */}
      <p className="mt-3 text-sm text-fg-tertiary">
        {t('confirmation.questions')}{' '}
        <a href="mailto:ryan@honuvibe.ai" className="text-accent-teal hover:underline">
          ryan@honuvibe.ai
        </a>
      </p>

      {/* Footer note */}
      <p className="mt-8 text-xs text-fg-tertiary">
        {t('footer_note')}
      </p>
    </div>
  );
}
