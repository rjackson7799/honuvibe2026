'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ResourceFilter } from './ResourceFilter';
import { ResourceCard } from './ResourceCard';
import { InfluencerCard } from './InfluencerCard';
import { CtaStrip } from '@/components/sections/cta-strip';
import { SectionHeading } from '@/components/ui/section-heading';
import { Overline } from '@/components/ui/overline';
import { trackEvent } from '@/lib/analytics';
import type { Resource, Influencer, ResourceCategory } from '@/lib/sanity/types';

type ResourcesContentProps = {
  resources: Resource[];
  influencers: Influencer[];
  locale: string;
};

const CATEGORY_KEYS: ('all' | ResourceCategory)[] = ['all', 'build', 'create', 'learn', 'business', 'communicate'];

function resolveText(en: string, jp?: string, locale?: string): string {
  return locale === 'ja' && jp ? jp : en;
}

export function ResourcesContent({ resources, influencers, locale }: ResourcesContentProps) {
  const t = useTranslations('resources_page');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = CATEGORY_KEYS.map((key) => ({
    value: key,
    label: t(`filter_${key}`),
  }));

  const featuredResources = resources.filter((r) => r.isFeatured);
  const filteredResources =
    activeCategory === 'all'
      ? resources.filter((r) => !r.isFeatured)
      : resources.filter((r) => r.category === activeCategory);

  const categoryLabelMap: Record<string, string> = {
    build: t('filter_build'),
    create: t('filter_create'),
    learn: t('filter_learn'),
    business: t('filter_business'),
    communicate: t('filter_communicate'),
  };

  const pricingLabelMap: Record<string, string> = {
    free: t('pricing_free'),
    freemium: t('pricing_freemium'),
    paid: t('pricing_paid'),
  };

  return (
    <div className="flex flex-col gap-12 md:gap-16">
      {/* Featured Row */}
      {featuredResources.length > 0 && (
        <div>
          <Overline className="mb-4">{t('featured_label')}</Overline>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none -mx-5 px-5 md:mx-0 md:px-0 md:grid md:grid-cols-2 xl:grid-cols-3 md:overflow-visible">
            {featuredResources.map((resource) => (
              <div key={resource.slug.current} className="shrink-0 w-[300px] md:w-auto" style={{ scrollSnapAlign: 'start' }}>
                <ResourceCard
                  name={resource.name}
                  description={resolveText(resource.description_en, resource.description_jp, locale)}
                  logoUrl={resource.logoUrl}
                  category={resource.category}
                  pricing={resource.pricing}
                  url={resource.url}
                  relatedLibraryVideoSlug={resource.relatedLibraryVideoSlug}
                  relatedCourseSlug={resource.relatedCourseSlug}
                  isFeatured
                  locale={locale}
                  categoryLabel={categoryLabelMap[resource.category] || resource.category}
                  pricingLabel={pricingLabelMap[resource.pricing] || resource.pricing}
                  visitLabel={t('visit_tool')}
                  tutorialLabel={t('watch_tutorial')}
                  courseLabel={t('used_in_course')}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter + Tool Grid */}
      <div>
        <ResourceFilter
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          locale={locale}
        />

        {filteredResources.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 mt-6">
            {filteredResources.map((resource) => (
              <ResourceCard
                key={resource.slug.current}
                name={resource.name}
                description={resolveText(resource.description_en, resource.description_jp, locale)}
                logoUrl={resource.logoUrl}
                category={resource.category}
                pricing={resource.pricing}
                url={resource.url}
                relatedLibraryVideoSlug={resource.relatedLibraryVideoSlug}
                relatedCourseSlug={resource.relatedCourseSlug}
                locale={locale}
                categoryLabel={categoryLabelMap[resource.category] || resource.category}
                pricingLabel={pricingLabelMap[resource.pricing] || resource.pricing}
                visitLabel={t('visit_tool')}
                tutorialLabel={t('watch_tutorial')}
                courseLabel={t('used_in_course')}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-fg-tertiary">{t('empty_state')}</p>
          </div>
        )}
      </div>

      {/* Divider */}
      <hr className="border-border-default" />

      {/* Influencers Section */}
      {influencers.length > 0 && (
        <div>
          <SectionHeading
            overline="CREATORS"
            heading={t('influencers_heading')}
            sub={t('influencers_sub')}
          />
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 mt-8">
            {influencers.map((influencer) => (
              <InfluencerCard
                key={influencer.slug.current}
                name={influencer.name}
                description={resolveText(influencer.description_en, influencer.description_jp, locale)}
                avatarUrl={influencer.avatarUrl}
                platforms={influencer.platforms || []}
                specialty={influencer.specialty}
                locale={locale}
                followLabel={t('follow_on')}
              />
            ))}
          </div>
        </div>
      )}

      {/* CTA Strip */}
      <CtaStrip
        heading={t('cta_heading')}
        sub={t('cta_sub')}
        ctaText={t('cta_button')}
        ctaHref={`/${locale === 'ja' ? 'ja/' : ''}learn`}
      />
    </div>
  );
}
