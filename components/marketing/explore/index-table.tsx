'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';
import {
  INDEX_PROJECTS,
  INDUSTRY_FILTERS,
  type IndexProject,
  type IndustryFilter,
  type ProjectStatus,
} from '@/lib/explore/projects';
import { cn } from '@/lib/utils';

type FilterValue = 'all' | IndustryFilter;

const STATUS_TONE: Record<ProjectStatus, string> = {
  live: 'bg-[rgba(15,169,160,0.14)] text-[var(--m-accent-teal)]',
  in_progress: 'bg-[rgba(232,118,90,0.14)] text-[var(--m-accent-coral)]',
  confidential: 'bg-[rgba(26,43,51,0.06)] text-[var(--m-ink-tertiary)]',
};

export function ExploreIndex() {
  const t = useTranslations('explore.index');
  const [filter, setFilter] = useState<FilterValue>('all');

  const visible = useMemo(
    () =>
      filter === 'all'
        ? INDEX_PROJECTS
        : INDEX_PROJECTS.filter((p) => p.industryFilter === filter),
    [filter],
  );

  const counts = useMemo(() => {
    const live = INDEX_PROJECTS.filter((p) => p.status !== 'confidential').length;
    const industries = new Set(INDEX_PROJECTS.map((p) => p.industryFilter)).size;
    return { total: INDEX_PROJECTS.length, live, industries };
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <Section variant="canvas" spacing="default">
      <Container>
        {/* Top meta strip */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--m-border-soft)] pb-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
          <span>{t('meta_strip_left')}</span>
          <span>{t('meta_strip_center', { vol: pad(2) })}</span>
          <span>
            {t('meta_strip_right', {
              entries: pad(counts.total),
              industries: counts.industries,
            })}
          </span>
        </div>

        {/* Headline */}
        <div className="mb-8 flex items-end justify-between gap-6">
          <h2
            className="font-serif italic leading-[0.95] tracking-[-0.02em] text-[var(--m-ink-primary)]"
            style={{ fontSize: 'clamp(64px, 10vw, 132px)' }}
          >
            {t('headline')}
            <span className="text-[var(--m-accent-teal)]">.</span>
          </h2>
          <p className="hidden max-w-[280px] text-right font-mono text-[11.5px] uppercase leading-[1.7] tracking-[0.12em] text-[var(--m-ink-tertiary)] md:block">
            {t('headline_caption')}
          </p>
        </div>

        {/* Filter pills */}
        <div className="mb-8 flex flex-wrap items-center gap-2 border-y border-[var(--m-border-soft)] py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
          <span className="mr-2">{t('filter_label')}</span>
          <FilterPill
            label={t('filter_all')}
            isActive={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          {INDUSTRY_FILTERS.map((f) => (
            <FilterPill
              key={f}
              label={t(`filter_${f}`)}
              isActive={filter === f}
              onClick={() => setFilter(f)}
            />
          ))}
          <span className="ml-auto text-[var(--m-ink-tertiary)]">
            {t('showing_label', {
              shown: pad(visible.length),
              total: pad(counts.total),
            })}
          </span>
        </div>

        {/* Column headers (desktop) */}
        <div className="hidden grid-cols-[44px_60px_1fr_minmax(180px,1.1fr)_120px] gap-6 border-b border-[var(--m-border-soft)] py-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)] md:grid">
          <span>#</span>
          <span>{t('col_year')}</span>
          <span>{t('col_project')}</span>
          <span>{t('col_industry')}</span>
          <span className="text-right">{t('col_status')}</span>
        </div>

        {/* Rows */}
        <ul className="divide-y divide-[var(--m-border-soft)]">
          {visible.map((p) => (
            <IndexRow key={p.key} project={p} t={t} />
          ))}
        </ul>

        {/* End-of-index footer rule */}
        <div className="mt-10 flex items-center gap-4 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--m-ink-tertiary)]">
          <span className="h-px flex-1 bg-[var(--m-border-soft)]" aria-hidden />
          <span>{t('end_of_index')}</span>
          <span className="h-px flex-1 bg-[var(--m-border-soft)]" aria-hidden />
        </div>
      </Container>
    </Section>
  );
}

function FilterPill({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 transition-all',
        isActive
          ? 'bg-[var(--m-ink-primary)] text-white'
          : 'text-[var(--m-ink-secondary)] hover:bg-[rgba(26,43,51,0.06)] hover:text-[var(--m-ink-primary)]',
      )}
    >
      {label}
    </button>
  );
}

function IndexRow({
  project,
  t,
}: {
  project: IndexProject;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const isConfidential = project.status === 'confidential';
  const p = (suffix: string) => t(`projects.${project.key}.${suffix}`);
  const isLink = !!project.href && !isConfidential;

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    isLink ? (
      <a
        href={project.href}
        target={project.href!.startsWith('http') ? '_blank' : undefined}
        rel={project.href!.startsWith('http') ? 'noopener noreferrer' : undefined}
        className="group block py-5 transition-colors hover:bg-[rgba(15,169,160,0.04)]"
      >
        {children}
      </a>
    ) : (
      <div className="block py-5">{children}</div>
    );

  return (
    <li>
      <Wrapper>
        <div className="grid grid-cols-[44px_1fr] gap-x-6 gap-y-3 md:grid-cols-[44px_60px_1fr_minmax(180px,1.1fr)_120px] md:items-center md:gap-y-0">
          {/* # */}
          <span className="font-mono text-[12px] tracking-[0.08em] text-[var(--m-ink-tertiary)]">
            {project.number}.
          </span>

          {/* year (desktop) */}
          <span className="hidden font-mono text-[12px] tracking-[0.08em] text-[var(--m-ink-tertiary)] md:inline">
            {project.year}
          </span>

          {/* project name + brief */}
          <div className="col-start-2 md:col-start-3">
            <p className="flex items-center gap-2 text-[18px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
              {isConfidential ? t('confidential_name') : p('name')}
              {isLink && (
                <ArrowUpRight
                  size={14}
                  strokeWidth={2}
                  className="text-[var(--m-ink-tertiary)] transition-colors group-hover:text-[var(--m-accent-teal)]"
                  aria-hidden
                />
              )}
            </p>
            <p className="mt-1 text-[14px] leading-[1.55] text-[var(--m-ink-secondary)]">
              {isConfidential ? t('confidential_brief') : p('brief')}
            </p>
          </div>

          {/* industry + stack (desktop column) */}
          <div className="col-start-2 md:col-start-4">
            <p className="text-[13px] font-semibold text-[var(--m-ink-primary)]">
              {project.industry}
            </p>
            <p className="mt-1 font-mono text-[11.5px] leading-snug text-[var(--m-ink-tertiary)]">
              {project.stack.join(' · ')}
            </p>
          </div>

          {/* status (desktop right) */}
          <div className="col-start-2 md:col-start-5 md:justify-self-end">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em]',
                STATUS_TONE[project.status],
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
              {t(`status_${project.status}`)}
            </span>
          </div>
        </div>
      </Wrapper>
    </li>
  );
}
