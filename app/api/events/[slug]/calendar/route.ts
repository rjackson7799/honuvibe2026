import { type NextRequest } from 'next/server';
import {
  publicEventBySlug,
  publicEventTitle,
  publicEventDescription,
} from '@/lib/events/public-events';
import { buildEventIcs } from '@/lib/events/ics';

/**
 * Public .ics for an event (no PII — event details + public page link only).
 * Linked from the confirmation page's "Add to calendar" button.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const event = publicEventBySlug(slug);
  if (!event) return new Response('Not found', { status: 404 });

  const lang = new URL(req.url).searchParams.get('lang') === 'ja' ? 'ja' : 'en';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';

  let ics: string;
  try {
    ics = buildEventIcs({
      uid: `${event.slug}@honuvibe.ai`,
      title: publicEventTitle(event, lang),
      description: publicEventDescription(event, lang),
      startsAt: new Date(event.startsAt),
      endsAt: event.endsAt ? new Date(event.endsAt) : null,
      eventPageUrl: `${siteUrl}/${lang === 'ja' ? 'ja/' : ''}events/${event.slug}`,
    });
  } catch (err) {
    console.error('[Event Calendar] ICS build failed:', err);
    return new Response('Unable to build calendar file', { status: 500 });
  }

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
