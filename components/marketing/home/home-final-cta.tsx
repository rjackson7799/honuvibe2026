import { useTranslations } from 'next-intl';
import { FinalCta } from '@/components/marketing/final-cta';

export function HomeFinalCta() {
  const t = useTranslations('home.final_cta');

  return (
    <FinalCta
      eyebrow={t('eyebrow')}
      headline={t('headline')}
      body={t('body')}
      note={t('refund_line')}
      primary={{ href: '/learn#vault', label: t('cta_primary') }}
      links={[
        { href: '/learn#courses', label: t('link_courses') },
        { href: '/partnerships', label: t('link_team') },
      ]}
    />
  );
}
