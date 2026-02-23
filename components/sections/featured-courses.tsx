'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading, Card, Tag, Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';

const courseKeys = ['ai_foundations', 'micro_saas', 'ai_automation'] as const;

export function FeaturedCourses() {
  const t = useTranslations('featured_courses');

  return (
    <Section id="courses">
      <Container size="wide">
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          sub={t('sub')}
          centered
        />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {courseKeys.map((key) => (
            <Card key={key} variant="glass" hover padding="lg" className="flex flex-col">
              {/* Course accent bar */}
              <div className="mb-5 h-1 w-12 rounded-full accent-bar-teal" />

              <h3 className="font-serif text-h3 text-fg-primary mb-3">
                {t(`courses.${key}.title`)}
              </h3>
              <p className="text-sm text-fg-secondary leading-relaxed mb-5 flex-1">
                {t(`courses.${key}.description`)}
              </p>

              <div className="flex items-center gap-2 mb-5">
                <Tag>{t(`courses.${key}.level`)}</Tag>
                <Tag color="var(--accent-gold)">{t(`courses.${key}.language`)}</Tag>
              </div>

              <Button variant="ghost" size="sm" className="self-start">
                {t('enroll')}
              </Button>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/learn" className="inline-flex items-center gap-2 text-sm font-medium text-accent-teal hover:text-accent-teal-hover transition-colors duration-[var(--duration-fast)]">
            {t('see_all')}
            <ArrowRight size={16} />
          </Link>
        </div>
      </Container>
    </Section>
  );
}
