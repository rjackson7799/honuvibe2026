import { getLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Star } from 'lucide-react';
import {
  Card,
  Container,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';
import { cn } from '@/lib/utils';
import { getPublishedTestimonials } from '@/lib/proof/queries';
import { HomeTestimonials } from './testimonials';

/**
 * Real, admin-authored, permissioned proof stories. Reads the sanitized public
 * view (proof_artifacts_public) — gated columns already arrive null.
 *
 * Row-count behaviour:
 *   - 4+ rows → the wall (1 → 2 → 3 responsive columns, row-major so visual
 *     order == DOM order == keyboard/screen-reader order).
 *   - 1–3 rows → the compact 3-card layout.
 *   - 0 rows → nothing renders in production. The hardcoded HomeTestimonials
 *     fallback is UNGOVERNED proof (it bypasses the /admin/proof permission
 *     system), so it is dev-only scaffolding: it must be migrated into
 *     /admin/proof as published rows, or deleted, before this section is
 *     considered launch-clean. See Checkpoint A in the redesign plan.
 *
 * Server component; renders plain JSX text only (no dangerouslySetInnerHTML).
 */
export async function ProofStories() {
  const [locale, t, stories] = await Promise.all([
    getLocale(),
    getTranslations('home.testimonials'),
    getPublishedTestimonials(9),
  ]);

  if (stories.length === 0) {
    return process.env.NODE_ENV === 'development' ? <HomeTestimonials /> : null;
  }

  const isJa = locale === 'ja';
  const isWall = stories.length >= 4;

  return (
    <Section variant="sand">
      <Container>
        <SectionHeading className="mb-12 text-center">
          {t('wall_heading')}
        </SectionHeading>
        <div
          className={cn(
            'grid gap-6',
            isWall ? 'sm:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3',
          )}
        >
          {stories.map((s) => {
            const quote = (isJa ? s.quote_jp ?? s.quote_en : s.quote_en) ?? '';
            const role = isJa ? s.role_jp ?? s.role_en : s.role_en;
            return (
              <Card key={s.id} className="relative px-7 py-8">
                <span
                  aria-hidden
                  className="absolute right-6 top-5 font-serif text-[48px] leading-none text-[var(--m-accent-coral)] opacity-35"
                >
                  &ldquo;
                </span>

                {s.rating != null && (
                  <div className="mb-3 flex gap-0.5" aria-label={`${s.rating} out of 5`}>
                    {Array.from({ length: s.rating }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className="fill-[var(--m-accent-gold)] text-[var(--m-accent-gold)]"
                      />
                    ))}
                  </div>
                )}

                <p className="mb-6 text-[15.5px] italic leading-[1.7] text-[var(--m-ink-primary)]">
                  &ldquo;{quote}&rdquo;
                </p>

                <div className="flex items-center gap-3">
                  {s.person_image_url && (
                    <Image
                      src={s.person_image_url}
                      alt={s.person_name ?? ''}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    {s.person_name && (
                      <p className="text-[14px] font-bold text-[var(--m-ink-primary)]">
                        {s.person_name}
                      </p>
                    )}
                    {(role || s.org) && (
                      <p className="mt-0.5 text-[12.5px] text-[var(--m-ink-tertiary)]">
                        {[role, s.org].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
