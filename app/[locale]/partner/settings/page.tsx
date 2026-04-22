import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { PartnerPortalLayout } from '@/components/partner-portal/PartnerPortalLayout';
import { resolvePartnerScope } from '@/lib/partner-portal/queries';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ as?: string }>;
};

export default async function PartnerSettingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { as: previewId } = await searchParams;
  setRequestLocale(locale);

  const scope = await resolvePartnerScope({ locale, previewId });
  if (!scope) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(`${prefix}/admin/partners`);
  }

  const { partner, previewMode } = scope;
  const pageUrl = `https://honuvibe.com/${locale}/partners/${partner.slug}`;

  return (
    <PartnerPortalLayout
      partnerName={partner.name_en}
      partnerLogoUrl={partner.logo_url}
      previewMode={previewMode}
    >
      <div className="max-w-[880px] space-y-8">
        <header>
          <h1 className="font-serif text-3xl text-fg-primary">Settings</h1>
          <p className="mt-1 text-sm text-fg-tertiary">
            Read-only profile for your partner organization. To change any of this, email
            {partner.contact_email ? (
              <a
                href={`mailto:hi@honuvibe.com?subject=Update%20${encodeURIComponent(partner.name_en)}%20profile`}
                className="ml-1 text-accent-teal hover:underline"
              >
                hi@honuvibe.com
              </a>
            ) : (
              <span className="ml-1">hi@honuvibe.com</span>
            )}
            .
          </p>
        </header>

        <section className="space-y-4 rounded-lg border border-border-default bg-bg-secondary p-6">
          <div className="flex items-start gap-4">
            {partner.logo_url ? (
              <Image
                src={partner.logo_url}
                alt={`${partner.name_en} logo`}
                width={72}
                height={72}
                className="rounded-lg border border-border-default object-contain"
                unoptimized
              />
            ) : (
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-lg border border-dashed border-border-default text-xs text-fg-tertiary">
                No logo
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="font-serif text-xl text-fg-primary">{partner.name_en}</h2>
              {partner.name_jp && (
                <p className="text-sm text-fg-secondary">{partner.name_jp}</p>
              )}
              {partner.tagline_en && (
                <p className="text-sm text-fg-secondary">{partner.tagline_en}</p>
              )}
              <p className="text-xs text-fg-tertiary font-mono">{partner.slug}</p>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-border-default bg-bg-secondary p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-fg-tertiary">
            Brand colors
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <ColorSwatch label="Primary" value={partner.primary_color} />
            <ColorSwatch label="Secondary" value={partner.secondary_color} />
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-border-default bg-bg-secondary p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-fg-tertiary">
            Attribution
          </h3>
          <Field label="Your co-branded page">
            <Link
              href={pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-sm text-accent-teal hover:underline"
            >
              {pageUrl} <ExternalLink size={12} />
            </Link>
          </Field>
          <Field label="Revenue share">
            <span className="text-sm text-fg-primary">
              {Number(partner.revenue_share_pct).toFixed(2)}%{' '}
              <span className="text-fg-tertiary">(informational; settlement off-platform)</span>
            </span>
          </Field>
          <Field label="Public listing">
            <span className="text-sm text-fg-primary">
              {partner.is_public ? 'Indexed by search engines' : 'Hidden from search engines'}
            </span>
          </Field>
        </section>

        {partner.description_en && (
          <section className="space-y-3 rounded-lg border border-border-default bg-bg-secondary p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-fg-tertiary">
              Description
            </h3>
            <p className="whitespace-pre-wrap text-sm text-fg-secondary">
              {partner.description_en}
            </p>
          </section>
        )}
      </div>
    </PartnerPortalLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6">
      <div className="w-40 shrink-0 text-xs uppercase tracking-wider text-fg-tertiary">
        {label}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function ColorSwatch({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-10 w-10 rounded border border-border-default"
        style={{ backgroundColor: value ?? 'transparent' }}
      />
      <div>
        <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
        <div className="font-mono text-sm text-fg-primary">{value ?? '—'}</div>
      </div>
    </div>
  );
}
