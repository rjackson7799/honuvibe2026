// components/partners/PartnerFilterChips.tsx
import Link from 'next/link';
import { cn } from '@/lib/utils';

type PartnerOpt = {
  slug: string;
  name_en: string;
  name_jp: string | null;
};

type Props = {
  partners: PartnerOpt[];
  selectedSlug: string | null; // null = "All"
  basePath: string;            // e.g. "/learn" or "/learn/vault"
  locale: string;
};

export function PartnerFilterChips({ partners, selectedSlug, basePath, locale }: Props) {
  if (partners.length === 0) return null;

  const prefix = locale === 'ja' ? '/ja' : '';
  const allHref = `${prefix}${basePath}`;

  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Filter by partner">
      <Chip href={allHref} selected={selectedSlug === null} label="All" />
      <Chip
        href={`${allHref}?owner=honuvibe`}
        selected={selectedSlug === 'honuvibe'}
        label="HonuVibe"
      />
      {partners.map((p) => (
        <Chip
          key={p.slug}
          href={`${allHref}?owner=${p.slug}`}
          selected={selectedSlug === p.slug}
          label={(locale === 'ja' && p.name_jp) || p.name_en}
        />
      ))}
    </nav>
  );
}

function Chip({ href, selected, label }: { href: string; selected: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-full border px-3 py-1 text-xs uppercase tracking-wider transition-colors',
        selected
          ? 'border-accent-teal bg-accent-teal/10 text-accent-teal'
          : 'border-border-default text-fg-tertiary hover:text-fg-secondary',
      )}
    >
      {label}
    </Link>
  );
}
