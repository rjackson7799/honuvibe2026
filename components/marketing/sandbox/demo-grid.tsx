import { useTranslations } from 'next-intl';
import { Container, Section, SectionHeading } from '@/components/marketing/primitives';
import { SANDBOX_DEMOS } from '@/lib/sandbox/demos';
import { SandboxDemoCard } from './demo-card';

export function SandboxDemoGrid() {
  const t = useTranslations('sandbox.grid');

  return (
    <Section variant="sand" spacing="default" id="demos">
      <Container>
        <div className="mb-10 max-w-[620px] md:mb-14">
          <SectionHeading>{t('headline')}</SectionHeading>
          <p className="mt-3 text-[16px] leading-[1.65] text-[var(--m-ink-secondary)]">
            {t('subhead')}
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-10">
          {SANDBOX_DEMOS.map((demo, i) => (
            // Both cards sit at/near the fold and trade off as LCP by
            // viewport — eager-load the first two.
            <SandboxDemoCard key={demo.slug} demo={demo} priority={i < 2} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
