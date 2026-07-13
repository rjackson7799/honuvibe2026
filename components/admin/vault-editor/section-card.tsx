import type { ReactNode } from 'react';

type SectionCardProps = {
  id: string;
  number: number;
  title: string;
  /** Right-aligned slot in the card header (e.g. "4 selected", a translate button). */
  meta?: ReactNode;
  children: ReactNode;
};

/**
 * Numbered card shell for the Vault editor's 5-step layout. `scroll-mt-28`
 * keeps anchor scrolls clear of the sticky header; the `id` doubles as the
 * scroll-spy target.
 */
export function SectionCard({ id, number, title, meta, children }: SectionCardProps) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-xl border border-border-default bg-bg-secondary p-5 sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-tertiary text-xs font-semibold text-fg-secondary">
            {number}
          </span>
          <h2 className="font-serif text-lg text-fg-primary">{title}</h2>
        </div>
        {meta}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
