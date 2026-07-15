import { useTranslations } from 'next-intl';
import { FinalCta } from '@/components/marketing/final-cta';

export function AboutFinalCta() {
  const t = useTranslations('about.final_cta');

  return (
    <FinalCta
      variant="canvas"
      eyebrow={t('eyebrow')}
      headline={t('headline')}
      body={t('body')}
      primary={{ href: '/learn#vault', label: t('cta_primary') }}
      links={[
        { href: '/learn#courses', label: t('link_courses') },
        { href: '/partnerships', label: t('link_team') },
      ]}
    />
  );
}
