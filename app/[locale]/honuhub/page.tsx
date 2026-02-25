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

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HonuHubPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <HonuHubHero />
      <HonuHubAbout />
      <HonuHubModes />
      <HonuHubSessions />
      <HonuHubRemote />
      <HonuHubMembership />
      <HonuHubLocation />
    </>
  );
}
