import { setRequestLocale } from 'next-intl/server';
import { permanentRedirect } from 'next/navigation';
import { CheckCircle2, Clock, KeyRound } from 'lucide-react';
import { authorizeProposalSession } from '@/lib/studio/engagement/proposal-session';
import { proposalPath } from '@/lib/studio/engagement/proposal-token';
import { buildProposalDocModel, hstDateOf, issuedSnapshotSchema } from '@/lib/studio/engagement/proposal-document';
import { ProposalAcceptForm } from '@/components/proposal/ProposalAcceptForm';
import { ProposalDocument, ProposalShell, Wordmark } from '@/components/proposal/ProposalDocument';
import { ProposalFatalCard } from '@/components/proposal/ProposalFatalCard';
import { T } from '@/components/proposal/copy';

// The client proposal page — /proposal/<id> · /ja/proposal/<id> (slice 3,
// slice B). Cookie-authenticated (the entry route set hv_engp_<id>); the URL
// holds only a UUID. Never prerendered, cached or indexed: force-dynamic,
// robots metadata, and the no-store / no-referrer / X-Robots-Tag headers for
// /proposal/* in next.config.ts. Chromeless via conditional-nav.tsx.
//
// The page renders ONLY buildProposalDocModel(issued_snapshot) plus the LIVE
// valid_until (decision #12 — the one client-visible field allowed to
// change, forward only). Nothing is read from the live engagement: the
// cover's business/contact/date are frozen in the snapshot at issue.
//
// Locale prefix: the discovery page's rule, verbatim. A ja proposal at
// /proposal/<id> 308s to /ja/; an en proposal reached under /ja renders IN
// PLACE with its own lang + typography (bouncing it would ping-pong with
// next-intl's middleware; a NEXT_LOCALE pin was rejected on review).
//
// States: sent + not past valid_until → the accept form; past valid_until →
// the expired band, no form; accepted → the accepted band (name + date);
// anything else that still holds a live token (should not happen — revise,
// withdraw and void all revoke it) → the "no longer open" band, no form.

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Proposal — HonuVibe Studio',
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function longDate(iso: string, locale: 'en' | 'ja'): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const d = dateOnly ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  return d.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: dateOnly ? 'UTC' : 'Pacific/Honolulu',
  });
}

function Band({ tone, icon, title, body }: { tone: 'teal' | 'coral' | 'muted'; icon: 'ok' | 'clock' | 'key' | null; title: string | null; body: string }) {
  const border = tone === 'teal' ? 'border-[var(--m-accent-teal)]/30 bg-[rgba(15,169,160,0.08)]' : tone === 'coral' ? 'border-[rgba(232,118,90,0.4)] bg-[rgba(232,118,90,0.08)]' : 'border-[var(--m-border-soft)] bg-[var(--m-white)]';
  const color = tone === 'teal' ? 'var(--m-accent-teal)' : 'var(--m-accent-coral)';
  return (
    <div role="status" data-band={tone} className={`flex items-start gap-3 rounded-[14px] border px-4 py-3.5 ${border}`}>
      {icon === 'ok' ? <CheckCircle2 size={20} className="mt-0.5 shrink-0" style={{ color }} /> : icon === 'clock' ? <Clock size={20} className="mt-0.5 shrink-0" style={{ color }} /> : icon === 'key' ? <KeyRound size={20} className="mt-0.5 shrink-0" style={{ color }} /> : null}
      <div className="min-w-0">
        {title ? <p className="text-[14.5px] font-bold text-[var(--m-ink-primary)]">{title}</p> : null}
        <p className="text-[14px] leading-[1.7] text-[var(--m-ink-secondary)]">{body}</p>
      </div>
    </div>
  );
}

export default async function ProposalPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const lang = locale === 'ja' ? 'ja' : 'en';

  if (!UUID_RE.test(id)) return <ProposalFatalCard locale={lang} kind="forbidden" />;

  const auth = await authorizeProposalSession(id);
  if (!auth.ok) {
    return <ProposalFatalCard locale={lang} kind={auth.status === 410 ? 'expired' : auth.status === 503 ? 'unavailable' : 'forbidden'} />;
  }
  const p = auth.proposal;

  if (p.locale !== lang && p.locale === 'ja') {
    // A JA proposal always lives under /ja (see the header comment).
    permanentRedirect(proposalPath('ja', p.id));
  }
  const t = T[p.locale];

  const snap = issuedSnapshotSchema.safeParse(p.issued_snapshot);
  if (!snap.success) {
    // A token only exists on an issued row, so a missing/invalid snapshot is a
    // data fault, not a client state. Log the shape problem, never the blob.
    console.error(`[proposal page] issued_snapshot invalid for ${p.id}: ${snap.error.issues.length} issue(s)`);
    return <ProposalFatalCard locale={p.locale} kind="unavailable" />;
  }
  const model = buildProposalDocModel(snap.data, { validUntil: p.valid_until, preview: false });
  const validUntilLong = p.valid_until ? longDate(p.valid_until, p.locale) : null;
  const expired = !!p.valid_until && p.valid_until < hstDateOf(new Date());

  const pdfHref = `/api/engagement/proposal/${p.id}/pdf`;
  const pdfLink =
    'inline-flex min-h-[44px] items-center justify-center rounded-[10px] border border-[var(--m-border-strong)] bg-[var(--m-white)] px-4 text-[14px] font-semibold text-[var(--m-ink-primary)] transition-colors hover:border-[var(--m-accent-teal)]';

  let band: React.ReactNode;
  let form: React.ReactNode = null;
  if (p.status === 'accepted' && p.accepted_at) {
    band = <Band tone="teal" icon="ok" title={t.acceptedBandTitle} body={t.acceptedBand(p.accepted_by_name ?? '', longDate(p.accepted_at, p.locale))} />;
  } else if (p.status === 'sent' && expired) {
    band = <Band tone="coral" icon="clock" title={t.expiredBandTitle} body={t.expiredBandBody(validUntilLong)} />;
  } else if (p.status === 'sent') {
    band = <Band tone="muted" icon={null} title={null} body={t.openBand(validUntilLong)} />;
    form = <ProposalAcceptForm proposalId={p.id} locale={p.locale} businessName={model.cover.business_name} />;
  } else {
    band = <Band tone="coral" icon="key" title={t.closedBandTitle} body={t.closedBandBody} />;
  }

  return (
    <ProposalShell
      locale={p.locale}
      header={
        <>
          <div className="min-w-0">
            <Wordmark />
            <p className="truncate text-[12px] text-[var(--m-ink-secondary)]">
              {t.eyebrow} · {model.cover.business_name}
            </p>
          </div>
          <a href={pdfHref} className={pdfLink} data-download-pdf>
            {t.downloadPdf}
          </a>
        </>
      }
    >
      <div className="space-y-6">
        {band}
        <ProposalDocument model={model} />
        {form}
        <p className="text-center text-[12.5px] text-[var(--m-ink-secondary)]">
          <a href={pdfHref} className="underline hover:no-underline">
            {t.downloadPdf}
          </a>
        </p>
      </div>
    </ProposalShell>
  );
}
