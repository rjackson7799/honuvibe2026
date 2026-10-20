import { useTranslations } from 'next-intl';
import { HvCtaBand, HvSection } from '@/components/marketing/hv';
import type { CourseCta } from '@/lib/learn/course-cta';
import type { CourseDetailView } from '@/lib/learn/course-detail';
import { CourseCtaButton } from './course-cta-button';

type CourseClosingProps = { view: CourseDetailView; cta: CourseCta; ctaLabel: string };

/** Design 03 closing band (:263-271). Title + body follow the access variant (D2). */
export function CourseClosing({ view, cta, ctaLabel }: CourseClosingProps) {
  const t = useTranslations('course_detail');
  const waiting = cta.kind === 'closed' || cta.kind === 'full';
  const title = waiting ? t('closing.title_closed') : t('closing.title', { course: view.title });

  let body: string | undefined;
  switch (cta.priceCard) {
    case 'vault_join':
      body = t('closing.body.vault_join');
      break;
    case 'vault_member':
      body = t('price_card.vault_member.body');
      break;
    case 'enrolled':
      body = t('price_card.enrolled.body');
      break;
    case 'free':
      body = t('price_card.free.body');
      break;
    case 'contact':
      body = t(view.courseType === '1v1' ? 'price_card.contact.one_on_one.body' : 'price_card.contact.other.body');
      break;
    case 'course_price':
      body =
        cta.kind === 'closed'
          ? t('price_card.course_price.closed_note')
          : cta.kind === 'full'
            ? t('price_card.course_price.full_note')
            : undefined;
      break;
  }

  return (
    <HvSection spacing="flush" className="pt-14">
      <HvCtaBand
        title={title}
        body={body}
        actions={<CourseCtaButton cta={cta} label={ctaLabel} courseId={view.id} slug={view.slug} />}
      />
    </HvSection>
  );
}
