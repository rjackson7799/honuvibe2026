import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { publicEventBySlug } from '@/lib/events/public-events';
import { getEventSurveyBundle, getResponseCount } from '@/lib/survey/event-surveys';
import { EventSurveyBuilder } from '@/components/admin/event-survey/EventSurveyBuilder';

type Props = {
  params: Promise<{ locale: string; eventSlug: string }>;
};

export const metadata = {
  title: 'Event Survey — Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminEventSurveyBuilderPage({ params }: Props) {
  const { locale, eventSlug } = await params;
  setRequestLocale(locale);

  const event = publicEventBySlug(eventSlug);
  if (!event) notFound();

  const bundle = await getEventSurveyBundle(eventSlug);
  const hasResponses = bundle ? (await getResponseCount(bundle.survey.id)) > 0 : false;

  return (
    <EventSurveyBuilder
      event={{
        slug: event.slug,
        titleEn: event.titleEn,
        titleJp: event.titleJp,
        startsAt: event.startsAt,
      }}
      survey={bundle?.survey ?? null}
      settings={bundle?.settings ?? null}
      questions={bundle?.questions ?? []}
      hasResponses={hasResponses}
    />
  );
}
