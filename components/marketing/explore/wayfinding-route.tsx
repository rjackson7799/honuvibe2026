import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';
import { BrowserFrame, Container, Section } from '@/components/marketing/primitives';
import {
  INDEX_PROJECTS,
  REEL_PROJECTS,
  type IndexProject,
  type ProjectStatus,
  type ReelProject,
} from '@/lib/explore/projects';
import { cn } from '@/lib/utils';

const STATUS_TONE: Record<ProjectStatus, string> = {
  live: 'bg-[rgba(15,169,160,0.16)] text-[var(--m-accent-teal)]',
  in_progress: 'bg-[rgba(232,118,90,0.18)] text-[var(--m-accent-coral)]',
  confidential: 'bg-white/10 text-white/60',
};

const REEL_BY_KEY = new Map(REEL_PROJECTS.map((p) => [p.key, p]));

/**
 * "The route" — the charted line of client work (the signature element).
 * Each INDEX project is a waypoint plotted down a nautical bearing line.
 * Projects that also live in REEL_PROJECTS get an expanded waypoint (screenshot,
 * pull-quote, stats); the rest are compact; confidential ones read as fog.
 * Server-rendered — no client JS.
 */
export function WayfindingRoute() {
  const t = useTranslations('explore.chart');

  return (
    <Section variant="canvas" spacing="default">
      <Container>
        {/* Section header */}
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6 md:mb-16">
          <h2
            className="font-serif italic leading-[0.95] tracking-[-0.02em] text-white"
            style={{ fontSize: 'clamp(40px, 6vw, 76px)' }}
          >
            {t('route_label')}
            <span className="text-[var(--m-accent-teal)]">.</span>
          </h2>
          <p className="max-w-[280px] font-mono text-[11px] uppercase leading-[1.7] tracking-[0.14em] text-white/60 md:text-right">
            {t('route_caption')}
          </p>
        </div>

        {/* The charted line */}
        <div className="relative">
          {/* Bearing line */}
          <span
            aria-hidden
            className="wf-route-line absolute bottom-6 left-[19px] top-3 w-px md:left-[23px]"
          />

          <ol className="space-y-14 md:space-y-20">
            {INDEX_PROJECTS.map((project) => {
              const reel = REEL_BY_KEY.get(project.key);
              return (
                <li
                  key={project.key}
                  className="grid grid-cols-[40px_1fr] gap-x-4 md:grid-cols-[48px_1fr] md:gap-x-8"
                >
                  <WaypointMarker status={project.status} />
                  <div className="min-w-0">
                    {reel ? (
                      <ExpandedWaypoint project={project} reel={reel} />
                    ) : (
                      <CompactWaypoint project={project} />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Terminus */}
          <div className="mt-12 flex items-center gap-3 pl-[6px] font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/60 md:pl-[10px]">
            <span aria-hidden className="text-[var(--m-accent-teal)]">✦</span>
            {t('route_terminus')}
          </div>
        </div>
      </Container>
    </Section>
  );
}

function WaypointMarker({ status }: { status: ProjectStatus }) {
  // Live = filled twinkling star; in-progress = hollow ring; fog = faint dot.
  return (
    <div className="relative z-10 flex justify-center pt-1">
      {status === 'live' ? (
        <Star className="wf-star h-5 w-5 text-[var(--m-accent-teal)] md:h-6 md:w-6" />
      ) : status === 'in_progress' ? (
        <span className="mt-1 grid h-4 w-4 place-items-center rounded-full border-2 border-[var(--m-accent-coral)] bg-[#0A2624] md:h-[18px] md:w-[18px]">
          <span className="h-1 w-1 rounded-full bg-[var(--m-accent-coral)]" />
        </span>
      ) : (
        <span className="mt-1 h-3 w-3 rounded-full border border-white/25 bg-white/10 md:h-3.5 md:w-3.5" />
      )}
    </div>
  );
}

function WaypointHeader({
  project,
  statusLabel,
}: {
  project: IndexProject;
  statusLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] uppercase tracking-[0.15em]">
      <span className="text-white/65">
        {project.number} · {project.year}
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.12em]',
          STATUS_TONE[project.status],
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
        {statusLabel}
      </span>
      <span className="text-white/65">{project.industry}</span>
    </div>
  );
}

function ExpandedWaypoint({
  project,
  reel,
}: {
  project: IndexProject;
  reel: ReelProject;
}) {
  const t = useTranslations('explore.chart');
  const tp = useTranslations('explore.reel_hero');
  // reel.key is a plain string → sidestep next-intl's static-key typing (same
  // escape hatch the old index-table used for dynamic project keys).
  const tpDyn = tp as unknown as (key: string) => string;
  const p = (suffix: string) => tpDyn(`projects.${reel.key}.${suffix}`);

  return (
    <article>
      <WaypointHeader project={project} statusLabel={t(`status_${project.status}`)} />

      <h3
        className="mt-4 font-serif italic leading-[1.02] tracking-[-0.015em] text-white"
        style={{ fontSize: 'clamp(30px, 4vw, 46px)' }}
      >
        {p('name')}
      </h3>
      <p className="mt-3 max-w-[52ch] text-[16px] leading-[1.55] text-white/75">
        {p('subhead')}
      </p>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        {/* Screenshot */}
        <BrowserFrame url={reel.url} height="auto" className="bg-white">
          <div className="relative aspect-[16/11] w-full bg-white">
            <Image
              src={reel.image}
              alt={reel.imageAlt}
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover object-top"
            />
          </div>
        </BrowserFrame>

        {/* Quote + stats */}
        <div>
          <blockquote className="border-l-2 border-[var(--m-accent-teal)] pl-5 font-serif italic text-[17px] leading-[1.55] text-white/90">
            &ldquo;{p('quote')}&rdquo;
          </blockquote>

          <div className="mt-7 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
            {[1, 2, 3].map((n) => (
              <div key={n}>
                <p className="font-serif text-[24px] leading-none tracking-[-0.02em] text-[var(--m-accent-teal)]">
                  {p(`stat_${n}_value`)}
                </p>
                <p className="mt-2 text-[13px] font-semibold leading-snug text-white">
                  {p(`stat_${n}_label`)}
                </p>
                <p className="mt-1 text-[11.5px] leading-snug text-white/60">
                  {p(`stat_${n}_caption`)}
                </p>
              </div>
            ))}
          </div>

          {reel.liveUrl && (
            <a
              href={reel.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-7 inline-flex items-center gap-1.5 text-[14px] font-bold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
            >
              {t('visit_label')}
              <ArrowUpRight
                size={15}
                strokeWidth={2}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function CompactWaypoint({ project }: { project: IndexProject }) {
  const t = useTranslations('explore.chart');
  const tp = useTranslations('explore.index');
  const tpDyn = tp as unknown as (key: string) => string;
  const isFog = project.status === 'confidential';

  const name = isFog ? t('fog_name') : tpDyn(`projects.${project.key}.name`);
  const brief = isFog ? t('fog_brief') : tpDyn(`projects.${project.key}.brief`);

  return (
    <article className="max-w-[62ch]">
      <WaypointHeader project={project} statusLabel={t(`status_${project.status}`)} />

      <h3
        className={cn(
          'mt-4 text-[22px] font-bold tracking-[-0.01em] text-white md:text-[26px]',
          isFog && 'italic text-white/75',
        )}
      >
        {name}
      </h3>
      <p className="mt-2 text-[15px] leading-[1.6] text-white/70">{brief}</p>

      <p className="mt-4 font-mono text-[11.5px] leading-snug tracking-[0.04em] text-white/60">
        <span className="text-white/50">{t('stack_label')} </span>
        {project.stack.join(' · ')}
      </p>
    </article>
  );
}

function Star({ className }: { className?: string }) {
  // 4-point wayfinding star.
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 0c.6 6.3 5.7 11.4 12 12-6.3.6-11.4 5.7-12 12-.6-6.3-5.7-11.4-12-12C6.3 11.4 11.4 6.3 12 0Z" />
    </svg>
  );
}
