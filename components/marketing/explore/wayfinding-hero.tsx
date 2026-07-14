import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/marketing/primitives';
import { INDEX_PROJECTS } from '@/lib/explore/projects';

/**
 * Explore hero — "The Wayfinding Chart" title band.
 * Pure thesis: names the chart, states the crossing metaphor, and hands off to
 * the route below (the signature element). Server-rendered — no client JS.
 */
export function WayfindingHero() {
  const t = useTranslations('explore.chart');

  const crossings = INDEX_PROJECTS.length;
  const industries = new Set(INDEX_PROJECTS.map((p) => p.industryFilter)).size;
  const fogged = INDEX_PROJECTS.filter((p) => p.status === 'confidential').length;

  return (
    <Section variant="canvas" spacing="hero" className="relative overflow-hidden">
      {/* Guiding-star glow, upper right (decorative) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(15,169,160,0.22), transparent 65%)',
        }}
      />

      <Container className="relative">
        {/* Eyebrow */}
        <p className="font-mono text-[11.5px] uppercase tracking-[0.2em] text-[var(--m-accent-teal)]">
          {t('eyebrow')}
        </p>

        {/* Headline */}
        <h1
          className="mt-6 max-w-[16ch] font-serif leading-[0.95] tracking-[-0.02em] text-white"
          style={{ fontSize: 'clamp(48px, 8vw, 108px)' }}
        >
          {t('headline_1')}{' '}
          <span className="italic text-[var(--m-accent-teal)]">
            {t('headline_2')}
          </span>
        </h1>

        {/* Lede */}
        <p className="mt-7 max-w-[54ch] text-[17px] leading-[1.65] text-white/75 md:text-[18px]">
          {t('lede')}
        </p>

        {/* Chart legend */}
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-6 font-mono text-[11.5px] uppercase tracking-[0.14em] text-white/55">
          <LegendItem value={String(crossings).padStart(2, '0')} label={t('legend_crossings')} />
          <span className="text-white/20" aria-hidden>·</span>
          <LegendItem value={String(industries).padStart(2, '0')} label={t('legend_industries')} />
          <span className="text-white/20" aria-hidden>·</span>
          <LegendItem value={String(fogged).padStart(2, '0')} label={t('legend_fog')} />
          <span className="ml-auto inline-flex items-center gap-2 text-white/60">
            <span aria-hidden>✦</span>
            {t('coords')}
          </span>
        </div>
      </Container>
    </Section>
  );
}

function LegendItem({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="text-[var(--m-accent-teal)]">{value}</span>
      <span>{label}</span>
    </span>
  );
}
