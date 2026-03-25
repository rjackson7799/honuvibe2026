import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/ui';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const partners = [
  { key: 'claude', src: '/images/partners/claude.svg', width: 160, height: 40, featured: true },
  { key: 'nextjs', src: '/images/partners/nextjs.svg', width: 100, height: 24, featured: false },
  { key: 'supabase', src: '/images/partners/supabase.svg', width: 110, height: 24, featured: false },
  { key: 'vercel', src: '/images/partners/vercel.svg', width: 100, height: 24, featured: false },
  { key: 'stripe', src: '/images/partners/stripe.svg', width: 80, height: 24, featured: false },
] as const;

export async function PartnerStrip() {
  const t = await getTranslations('partner_strip');

  return (
    <Section id="partners">
      <Container size="wide">
        <SectionHeading overline={t('overline')} heading={t('heading')} centered />

        <div className="mt-10 flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {partners.map((partner) => (
            <div
              key={partner.key}
              className={cn(
                'relative transition-all duration-[var(--duration-normal)]',
                'opacity-60 grayscale hover:opacity-100 hover:grayscale-0',
                partner.featured && 'opacity-80 order-first',
              )}
              title={t(`logos.${partner.key}` as const)}
            >
              <Image
                src={partner.src}
                alt={t(`logos.${partner.key}` as const)}
                width={partner.width}
                height={partner.height}
                className={cn(
                  partner.featured ? 'h-10 w-auto' : 'h-6 w-auto',
                  'invert',
                )}
              />
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
