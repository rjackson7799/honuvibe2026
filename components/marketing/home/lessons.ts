import type { PublicCatalogItem } from '@/lib/vault/catalog';
import type { PublicProofArtifact } from '@/lib/proof/types';

export type HomeLesson = { id: string; title: string };

const ROTATOR_SIZE = 5;
const RECENT_SIZE = 4;
const QUOTE_MAX = 140;

const time = (d: string | null) => (d ? Date.parse(d) || 0 : 0);

function toLesson(item: PublicCatalogItem, locale: string): HomeLesson {
  const jp = item.title_jp?.trim();
  return { id: item.id, title: locale === 'ja' && jp ? jp : item.title_en };
}

/**
 * Plan D1: the hero rotator is up to five lessons, featured first then newest;
 * "Recently added" is the four newest not already in the rotator. Both come
 * from the cached, cookie-less public catalog (view counts are all 0 today, so
 * there is no meaningful "trending" order to use).
 */
export function pickHomeLessons(
  catalog: readonly PublicCatalogItem[],
  locale: string,
): { rotator: HomeLesson[]; recent: HomeLesson[] } {
  const byFeaturedThenNewest = [...catalog].sort(
    (a, b) => Number(b.is_featured) - Number(a.is_featured) || time(b.publish_date) - time(a.publish_date),
  );
  const rotatorItems = byFeaturedThenNewest.slice(0, ROTATOR_SIZE);
  const inRotator = new Set(rotatorItems.map((i) => i.id));
  const recentItems = [...catalog]
    .filter((i) => !inRotator.has(i.id))
    .sort((a, b) => time(b.publish_date) - time(a.publish_date))
    .slice(0, RECENT_SIZE);
  return {
    rotator: rotatorItems.map((i) => toLesson(i, locale)),
    recent: recentItems.map((i) => toLesson(i, locale)),
  };
}

export type HomeProofQuote = { quote: string; source: string };

/**
 * Plan D3: a real, permissioned testimonial when one exists (JA falls back to
 * the EN quote), trimmed to 140 characters. Needs a name or an org to
 * attribute it to; otherwise the caller shows the lesson-count line instead.
 */
export function toHomeProofQuote(
  proof: PublicProofArtifact | undefined,
  locale: string,
): HomeProofQuote | null {
  if (!proof) return null;
  const raw = (locale === 'ja' && proof.quote_jp?.trim() ? proof.quote_jp : proof.quote_en)?.trim();
  const source = [proof.person_name, proof.org]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(locale === 'ja' ? '、' : ', ');
  if (!raw || !source) return null;
  const quote = raw.length > QUOTE_MAX ? `${raw.slice(0, QUOTE_MAX - 1).trimEnd()}…` : raw;
  return { quote, source };
}
