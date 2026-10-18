import { useTranslations } from 'next-intl';
import {
  HvEyebrow,
  HvFaqAccordion,
  HvHeading,
  HvSection,
  HvTestimonialCarousel,
  type FaqItem,
  type Testimonial,
} from '@/components/marketing/hv';

/** "Before you start.": testimonial carousel (hidden without quotes) beside six FAQs, first open. */
export function LearnFaq({ quotes }: { quotes: Testimonial[] }) {
  const t = useTranslations('learn_catalog.faq');
  const items = (t.raw('items') as FaqItem[]) ?? [];

  return (
    <HvSection id="faq">
      <div className="grid items-start gap-9 [grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))]">
        <div data-reveal>
          <HvEyebrow>{t('eyebrow')}</HvEyebrow>
          <HvHeading level="h2" className="mt-2.5 max-w-[16ch] text-hv-green-900 [word-break:auto-phrase]">
            {t('title')}
          </HvHeading>
          {quotes.length > 0 && (
            <HvTestimonialCarousel quotes={quotes} tone="light" className="mt-9 max-w-[480px]" />
          )}
        </div>
        <HvFaqAccordion items={items} defaultOpen={0} />
      </div>
    </HvSection>
  );
}
