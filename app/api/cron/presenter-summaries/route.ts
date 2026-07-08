import { NextResponse, type NextRequest } from 'next/server';
import { PUBLIC_EVENTS } from '@/lib/events/public-events';
import { sendPresenterSummary } from '@/lib/survey/send-presenter-summary';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const WINDOW_MS = 24 * 60 * 60 * 1000; // events starting within the next ~24h
const MAX_PER_RUN = 10; // bound per-invocation work (each may call the model)

/**
 * Hourly Vercel Cron. Sends the presenter summary once, ~24h before each event.
 * Idempotency, presenter-email / response / already-sent checks all live in
 * sendPresenterSummary — this route only selects due events and fans out.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Fail closed: refuse if no secret is configured or the bearer doesn't match.
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const due = PUBLIC_EVENTS.filter((e) => {
    const start = new Date(e.startsAt).getTime();
    return start > now && start - now <= WINDOW_MS; // upcoming, not yet started
  }).slice(0, MAX_PER_RUN);

  const results: Array<{ slug: string; sent: boolean; reason?: string }> = [];
  for (const e of due) {
    try {
      const res = await sendPresenterSummary(e.slug, 'cron');
      results.push({ slug: e.slug, sent: res.sent, reason: res.reason });
    } catch (err) {
      console.error(`[cron presenter-summaries] ${e.slug} failed:`, err);
      results.push({ slug: e.slug, sent: false, reason: 'error' });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
