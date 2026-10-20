import { getTranslations } from 'next-intl/server';
import type { Testimonial } from '@/components/marketing/hv';
import { getPublishedTestimonials } from '@/lib/proof/queries';
import type { PublicProofArtifact } from '@/lib/proof/types';

// Roadmap decision 11: real quotes only once three exist, else the site's i18n testimonials.
const MIN_REAL_QUOTES = 3;

function toQuote(proof: PublicProofArtifact, locale: string): Testimonial | null {
  const text = (locale === 'ja' && proof.quote_jp?.trim() ? proof.quote_jp : proof.quote_en)?.trim();
  const name = proof.person_name?.trim();
  const role = (locale === 'ja' && proof.role_jp?.trim() ? proof.role_jp : proof.role_en)?.trim();
  const org = [role, proof.org?.trim()].filter(Boolean).join(locale === 'ja' ? '、' : ', ');
  return text && name ? { text, name, org } : null;
}

/**
 * Testimonials for a marketing page's FAQ carousel (Learn, Course). Cookieless
 * (getPublishedTestimonials is cached), so prerendered pages stay static.
 */
export async function getPageQuotes(locale: string): Promise<Testimonial[]> {
  const proof = await getPublishedTestimonials(MIN_REAL_QUOTES);
  const realQuotes = proof.map((p) => toQuote(p, locale)).filter((q): q is Testimonial => q !== null);
  if (realQuotes.length >= MIN_REAL_QUOTES) return realQuotes;

  const tq = await getTranslations({ locale, namespace: 'social_proof.testimonials' });
  return (['two', 'one', 'three'] as const).map((k) => ({
    text: tq(`${k}.quote`),
    name: tq(`${k}.name`),
    org: tq(`${k}.role`),
  }));
}
