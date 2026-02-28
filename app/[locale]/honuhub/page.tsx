import { setRequestLocale } from 'next-intl/server';
import {
  HonuHubHero,
  HonuHubAbout,
  HonuHubModes,
  HonuHubSessions,
  HonuHubRemote,
  HonuHubMembership,
  HonuHubLocation,
} from '@/components/sections/honuhub';
import { DeepHonuBackground } from '@/components/ocean/deep-honu-background';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HonuHubPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      {/* Shared deep ocean background for hero + about */}
      <div className="dark-zone relative overflow-hidden">
        <DeepHonuBackground />
        <HonuHubHero />
        <HonuHubAbout />
        {/* Bottom fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-[150px] bg-gradient-to-b from-transparent to-bg-primary pointer-events-none z-10" />
      </div>
      <HonuHubModes />
      <HonuHubSessions />
      <HonuHubRemote />
      <HonuHubMembership />
      <HonuHubLocation />
    </>
  );
}
