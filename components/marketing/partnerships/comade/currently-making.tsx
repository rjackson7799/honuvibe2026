import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Container, LogoLockup, Section } from '@/components/marketing/primitives';
import { cn } from '@/lib/utils';

type Status = 'live' | 'in_progress' | 'reserved' | 'anonymous';

const CELLS: Array<{ key: string; status: Status }> = [
  { key: 'vertice', status: 'live' },
  { key: 'healthcare', status: 'anonymous' },
  { key: 'photography', status: 'anonymous' },
  { key: 'partner_d', status: 'in_progress' },
  { key: 'reserved_a', status: 'reserved' },
  { key: 'reserved_b', status: 'reserved' },
];

const STATUS_TONE: Record<Status, string> = {
  live: 'bg-[rgba(15,169,160,0.14)] text-[var(--m-accent-teal)]',
  in_progress: 'bg-[rgba(232,118,90,0.14)] text-[var(--m-accent-coral)]',
  reserved: 'bg-[rgba(26,43,51,0.06)] text-[var(--m-ink-tertiary)]',
  anonymous: 'bg-[rgba(26,43,51,0.06)] text-[var(--m-ink-tertiary)]',
};

export function ComadeCurrentlyMaking() {
  const t = useTranslations('partnerships.comade.currently_making');

  return (
    <Section variant="canvas" spacing="default">
      <Container>
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--m-border-soft)] pb-6 md:mb-14">
          <h2
            className="font-serif italic leading-[0.95] tracking-[-0.02em] text-[var(--m-ink-primary)]"
            style={{ fontSize: 'clamp(40px, 5.5vw, 72px)' }}
          >
            {t('headline')}
            <span className="text-[var(--m-accent-teal)]">.</span>
          </h2>
          <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
            {t('overline')}
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CELLS.map((cell) => (
            <li key={cell.key}>
              <Cell cell={cell} t={t} />
            </li>
          ))}
        </ul>

        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
          {t('footnote')}
        </p>
      </Container>
    </Section>
  );
}

function Cell({
  cell,
  t,
}: {
  cell: { key: string; status: Status };
  t: (key: string) => string;
}) {
  const isReserved = cell.status === 'reserved';
  const isAnonymous = cell.status === 'anonymous';
  const partnerColor = (() => {
    try {
      const c = t(`cells.${cell.key}.color`);
      return c?.startsWith('#') ? c : undefined;
    } catch {
      return undefined;
    }
  })();

  return (
    <div
      className={cn(
        'flex h-full flex-col gap-4 rounded-[14px] border bg-[var(--m-white)] px-5 py-5 transition-colors',
        isReserved
          ? 'border-dashed border-[var(--m-border-soft)] bg-transparent hover:border-[var(--m-accent-teal)]'
          : 'border-[var(--m-border-soft)]',
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
          {t(`cells.${cell.key}.sector`)}
        </p>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em]',
            STATUS_TONE[cell.status],
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {t(`status_${cell.status}`)}
        </span>
      </div>

      {isReserved ? (
        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-dashed border-[var(--m-accent-teal)] text-[var(--m-accent-teal)]">
            <Plus size={18} strokeWidth={2} />
          </span>
          <p className="mt-3 text-[14.5px] font-bold leading-snug text-[var(--m-ink-primary)]">
            {t(`cells.${cell.key}.display_name`)}
          </p>
          <p className="mt-1 text-[12.5px] leading-snug text-[var(--m-ink-secondary)]">
            {t(`cells.${cell.key}.invite`)}
          </p>
        </div>
      ) : isAnonymous ? (
        <div className="flex flex-1 flex-col py-2">
          <p className="font-serif italic text-[20px] leading-[1.2] text-[var(--m-ink-primary)]">
            {t(`cells.${cell.key}.display_name`)}
          </p>
          <p className="mt-2 text-[12.5px] leading-snug text-[var(--m-ink-secondary)]">
            {t(`cells.${cell.key}.note`)}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col py-2">
          <div className="flex justify-start">
            <LogoLockup
              left={t(`cells.${cell.key}.display_name`)}
              size="sm"
              theme="canvas"
              partnerColor={partnerColor}
            />
          </div>
          <p className="mt-3 text-[12.5px] leading-snug text-[var(--m-ink-secondary)]">
            {t(`cells.${cell.key}.note`)}
          </p>
        </div>
      )}
    </div>
  );
}
