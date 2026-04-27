import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import {
  Container,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';

export function HomeOrgSection() {
  const t = useTranslations('home.org_section');

  return (
    <Section variant="sand">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
          <div>
            <Overline tone="coral" className="mb-3.5">
              {t('overline')}
            </Overline>
            <SectionHeading className="mb-5 leading-[1.2]">
              {t('heading')}
            </SectionHeading>
            <p className="mb-8 text-[16px] leading-[1.7] text-[var(--m-ink-secondary)]">
              {t('body')}
            </p>
            <a
              href="/partnerships"
              className="inline-flex items-center gap-2 text-[15.5px] font-bold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
            >
              {t('cta')}
              <ArrowRight size={16} strokeWidth={2} />
            </a>
          </div>

          <div
            className="relative h-[380px] overflow-hidden rounded-[20px]"
            style={{
              background:
                'linear-gradient(135deg, #f2d9bc 0%, #e8c9a0 50%, #d9b888 100%)',
            }}
          >
            <div className="absolute inset-0 flex items-end p-6">
              <div className="rounded-[10px] bg-white/[0.88] px-4 py-3">
                <p className="text-[13px] font-semibold text-[var(--m-ink-primary)]">
                  {t('image_caption')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
