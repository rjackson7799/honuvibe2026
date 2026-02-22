'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading, Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { Calendar, ArrowRight } from 'lucide-react';

export function HonuHubSessions() {
  const t = useTranslations('honuhub_page.sessions');

  return (
    <Section>
      <Container>
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          sub={t('sub')}
          centered
        />

        {/* Coming soon placeholder */}
        <div className="mt-12 rounded-xl border border-border-default bg-bg-secondary/50 p-10 md:p-16 text-center">
          <Calendar size={40} className="mx-auto text-accent-teal/40 mb-4" />
          <p className="text-base text-fg-secondary leading-relaxed max-w-[480px] mx-auto">
            {t('coming_soon')}
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <Link href="/learn">
            <Button variant="ghost" icon={ArrowRight} iconPosition="right">
              {t('all_courses')}
            </Button>
          </Link>
        </div>
      </Container>
    </Section>
  );
}
