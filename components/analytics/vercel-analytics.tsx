'use client';

// Vercel Web Analytics with a beforeSend that DROPS the client discovery
// questionnaire (/discovery/<id>, /ja/discovery/<id>) and the client proposal
// page (/proposal/<id>, /ja/proposal/<id>). Low-severity — the URL holds only
// a UUID — but which client is reading a questionnaire or a proposal, and
// when, is genuinely confidential. A client component because beforeSend is a
// function and the [locale] layout is a Server Component (functions cannot
// cross that boundary as props). Keep the path list in sync with the Plausible
// data-exclude in app/[locale]/layout.tsx and the header map in next.config.ts.

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';

const EXCLUDED_PATH = /^\/(ja\/)?(discovery|proposal)(\/|$)/;

export function isAnalyticsExcludedUrl(url: string): boolean {
  try {
    const pathname = url.startsWith('/') ? url.split('?')[0] : new URL(url).pathname;
    return EXCLUDED_PATH.test(pathname);
  } catch {
    return false;
  }
}

function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  return isAnalyticsExcludedUrl(event.url) ? null : event;
}

export function VercelAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
