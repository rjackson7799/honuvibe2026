import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { PUBLIC_EVENTS } from '@/lib/events/public-events';
import { formatEventDateTime } from '@/lib/events/format';
import { BannerSettingsCard } from '@/components/admin/BannerSettingsCard';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Site Settings — Admin',
};

export default async function AdminSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data } = await supabase
    .from('site_settings')
    .select('banner_enabled, banner_event_slug')
    .eq('id', true)
    .maybeSingle();

  const eventOptions = PUBLIC_EVENTS.map((e) => ({
    slug: e.slug,
    label: `${e.titleEn} · ${formatEventDateTime(e.startsAt, e.timezone, 'en')}`,
  }));

  return (
    <div className="space-y-6 max-w-[880px]">
      <div>
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
          Site Settings
        </h1>
        <p className="mt-1 text-[14px] text-fg-secondary">
          Site-wide toggles that don&apos;t belong to a single page.
        </p>
      </div>
      <BannerSettingsCard
        initialEnabled={data?.banner_enabled ?? false}
        initialSlug={data?.banner_event_slug ?? null}
        eventOptions={eventOptions}
      />
    </div>
  );
}
