import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import {
  BrowserFrame,
  Container,
  Overline,
  PhotoPlaceholder,
  Section,
} from '@/components/marketing/primitives';
import { cn } from '@/lib/utils';

type ProjectStatus = 'live' | 'in_development';

type Project = {
  key: 'kwame' | 'hci';
  status: ProjectStatus;
  url: string;
  stack: readonly string[];
};

const PROJECTS: readonly Project[] = [
  {
    key: 'kwame',
    status: 'in_development',
    url: 'kwamebrathwaite.com',
    stack: ['Next.js', 'Tailwind CSS', 'Claude AI', 'Cursor', 'Vercel'],
  },
  {
    key: 'hci',
    status: 'live',
    url: 'hcimedicalgroup.com',
    stack: ['Next.js', 'Tailwind CSS', 'Supabase', 'Custom PM', 'Vercel'],
  },
] as const;

export function ExploreFeaturedProjects() {
  const t = useTranslations('explore.featured_projects');

  return (
    <Section variant="canvas" spacing="flush" className="pb-20 md:pb-24">
      <Container>
        <Overline tone="teal" className="mb-12 md:mb-14">
          {t('overline')}
        </Overline>
        <div className="flex flex-col gap-16 md:gap-[72px]">
          {PROJECTS.map((p, i) => (
            <ProjectRow key={p.key} project={p} flip={i % 2 === 1} />
          ))}
          <PlaceholderProject />
        </div>
      </Container>
    </Section>
  );
}

function ProjectRow({ project, flip }: { project: Project; flip: boolean }) {
  const t = useTranslations('explore.featured_projects');
  const ns = `${project.key}_` as const;

  const statusColor =
    project.status === 'live'
      ? 'bg-[rgba(15,169,160,0.12)] text-[var(--m-accent-teal)]'
      : 'bg-[var(--m-accent-coral-soft)] text-[var(--m-accent-coral)]';

  const visual = (
    <div className="w-full">
      <BrowserFrame url={project.url} height={380}>
        <PhotoPlaceholder
          variant="gradient"
          height={380}
          width="100%"
          label={`${project.key.toUpperCase()} mockup`}
          className="rounded-none border-0"
          bg={
            project.key === 'kwame'
              ? 'linear-gradient(160deg, #2a2018 0%, #3d2e1a 60%, #1a2028 100%)'
              : 'linear-gradient(155deg, #FAFCFF 0%, #E8F2FA 60%, #D4E6F0 100%)'
          }
        />
      </BrowserFrame>
    </div>
  );

  const details = (
    <div className="flex flex-col justify-center">
      <div className="mb-4 flex items-center gap-3">
        <Overline tone="teal">{t(`${ns}eyebrow`)}</Overline>
        <span
          className={cn(
            'rounded-full px-3 py-[3px] text-[11px] font-bold',
            statusColor,
          )}
        >
          {t(`${ns}status`)}
        </span>
      </div>
      <h3
        className="mb-2 font-bold leading-tight tracking-[-0.02em] text-[var(--m-ink-primary)]"
        style={{ fontSize: 'clamp(26px, 3vw, 36px)' }}
      >
        {t(`${ns}name`)}
      </h3>
      <p className="mb-7 text-[16px] leading-[1.5] text-[var(--m-ink-secondary)]">
        {t(`${ns}desc`)}
      </p>

      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[var(--m-accent-coral)]">
        {t('challenge_label')}
      </p>
      <p className="mb-6 text-[14.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
        {t(`${ns}challenge`)}
      </p>

      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[var(--m-accent-teal)]">
        {t('outcome_label')}
      </p>
      <p className="mb-3 text-[14.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
        {t(`${ns}outcome`)}
      </p>
      <p className="mb-7 text-[14.5px] italic leading-[1.6] text-[var(--m-accent-coral)]">
        &ldquo;{t(`${ns}highlight`)}&rdquo;
      </p>

      <div className="mb-6 grid grid-cols-3 gap-4 border-t border-[var(--m-border-soft)] pt-6">
        {[1, 2, 3].map((n) => (
          <div key={n}>
            <p className="mb-1 text-[18px] font-bold tracking-[-0.01em] text-[var(--m-accent-teal)]">
              {t(`${ns}stat_${n}_value`)}
            </p>
            <p className="text-[12px] text-[var(--m-ink-tertiary)]">
              {t(`${ns}stat_${n}_label`)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {project.stack.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[var(--m-border-strong)] px-3 py-1 text-[12px] font-medium text-[var(--m-ink-secondary)]"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        'grid items-center gap-10 md:gap-16',
        flip
          ? 'md:grid-cols-[1fr_1.1fr]'
          : 'md:grid-cols-[1.1fr_1fr]',
      )}
    >
      {flip ? (
        <>
          {details}
          {visual}
        </>
      ) : (
        <>
          {visual}
          {details}
        </>
      )}
    </div>
  );
}

function PlaceholderProject() {
  const t = useTranslations('explore.featured_projects');

  return (
    <div className="group rounded-[20px] border-[1.5px] border-dashed border-[rgba(26,43,51,0.18)] bg-transparent px-8 py-12 text-center transition-all duration-300 hover:border-[var(--m-accent-teal)] hover:bg-[var(--m-white)] hover:shadow-[0_8px_32px_rgba(15,169,160,0.08)] md:px-16 md:py-14">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-dashed border-[var(--m-accent-teal)] text-[var(--m-accent-teal)]">
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M11 4v14M4 11h14" />
        </svg>
      </div>
      <Overline tone="caption" className="mb-2.5 text-[var(--m-ink-tertiary)]">
        {t('placeholder_overline')}
      </Overline>
      <h3 className="mb-3 text-[26px] font-bold tracking-[-0.015em] text-[var(--m-ink-primary)]">
        {t('placeholder_title')}
      </h3>
      <p className="mx-auto mb-6 max-w-[480px] text-[15.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
        {t('placeholder_body')}
      </p>
      <a
        href="/contact"
        className="inline-flex items-center gap-1.5 text-[15px] font-bold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
      >
        {t('placeholder_cta')}
        <ArrowRight size={16} strokeWidth={2} />
      </a>
    </div>
  );
}
