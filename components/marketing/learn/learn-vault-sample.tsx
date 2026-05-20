import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { BrowserFrame } from '@/components/marketing/primitives';

export function LearnVaultSample() {
  const t = useTranslations('learn.chapter_vault');

  return (
    <div className="mt-16 md:mt-20">
      <div className="mb-7 max-w-[640px]">
        <h3
          className="font-serif italic leading-[1.15] tracking-[-0.01em] text-[var(--m-ink-primary)]"
          style={{ fontSize: 'clamp(28px, 3.2vw, 38px)' }}
        >
          {t('sample_heading')}
        </h3>
        <p className="mt-2 text-[16px] text-[var(--m-ink-secondary)]">
          {t('sample_subheading')}
        </p>
      </div>

      <BrowserFrame url="vault.honuvibe.ai/sample-lesson" height="auto">
        <VaultSamplePlayerPlaceholder label={t('sample_coming_soon')} />
      </BrowserFrame>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13.5px] text-[var(--m-ink-secondary)]">
          {t('sample_caption')}
        </p>
        <a
          href="#vault"
          className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
        >
          {t('sample_link')}
          <ArrowRight size={16} strokeWidth={2} />
        </a>
      </div>
    </div>
  );
}

function VaultSamplePlayerPlaceholder({ label }: { label: string }) {
  return (
    <div
      className="relative flex h-[360px] w-full items-center justify-center overflow-hidden"
      style={{
        background:
          'linear-gradient(160deg, #0A2929 0%, #0F3D3D 55%, #143434 100%)',
      }}
    >
      <div
        className="absolute inset-0 opacity-25"
        style={{
          background:
            'radial-gradient(circle at 25% 30%, rgba(79,168,156,0.5), transparent 55%), radial-gradient(circle at 75% 75%, rgba(15,169,160,0.3), transparent 55%)',
        }}
        aria-hidden
      />
      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-white/12 text-white">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor" aria-hidden>
            <path d="M7 4v14l11-7z" />
          </svg>
        </span>
        <p className="text-[12px] font-mono uppercase tracking-[0.14em] text-white/75">
          {label}
        </p>
      </div>
      <div className="absolute inset-x-6 bottom-5 flex items-center gap-3">
        <span className="text-[10.5px] text-white/60">00:00</span>
        <div className="h-[3px] flex-1 rounded-[2px] bg-white/20">
          <div className="h-full w-[0%] rounded-[2px] bg-[var(--m-accent-teal)]" />
        </div>
        <span className="text-[10.5px] text-white/50">01:30</span>
      </div>
    </div>
  );
}
