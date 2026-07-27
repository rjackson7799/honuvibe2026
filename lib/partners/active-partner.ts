import type { SupabaseClient } from '@supabase/supabase-js';
import type { routing } from '@/i18n/routing';
import { isRenderableRemoteImage } from '@/lib/images/remote-patterns';
import { LEARN_ZONE_SURFACES, safeAccentColorOn, withAlpha } from './contrast';

export type Locale = (typeof routing)['locales'][number];

/** Decorative only — never a UI boundary, so it is capped well below a visible edge. */
const MAX_WASH_ALPHA = 0.06;

export type ActivePartnerContext = {
  partnerId: string;
  slug: string;
  /** Locale-resolved. */
  name: string;
  /** Null when absent OR not renderable by next/image. */
  logoUrl: string | null;
  /** 3:1-checked against the learn-zone surfaces; null => caller uses var(--accent-teal). */
  accent: string | null;
  accentSubtle: string | null;
  /** <= 6% alpha of secondary_color. Decorative. */
  accentWash: string | null;
};

type PartnerRow = {
  id: string;
  slug: string;
  name_en: string;
  name_jp: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  is_active: boolean | null;
};

/**
 * The user's active partner plus its branding, or null.
 *
 * THE CHOKEPOINT: nothing else may resolve a user's partner for display. This is
 * a *cosmetic* helper — it is not an authorization or scope source. Community
 * feed scope comes from `community_scope_for` (see `lib/community/scope.ts`),
 * which deliberately applies a different rule: it does not check
 * `partners.is_active`, and this does.
 *
 * SESSION CONTRACT: this does NOT revalidate the session. The page owns
 * authentication and has already called `supabase.auth.getUser()`. A second call
 * would be a real round trip, because @supabase/ssr validates against the auth
 * server. `authenticatedUserId` is therefore A FILTER, NOT A TRUST BOUNDARY:
 * `pm_self_read` (`042_community_feed.sql:127`) restricts this query to
 * `auth.uid()` regardless of what id is passed, so a mismatched id returns zero
 * rows and can never surface another user's membership. RLS is the boundary.
 */
export async function getActivePartnerContext(
  supabase: SupabaseClient,
  authenticatedUserId: string,
  locale: Locale,
): Promise<ActivePartnerContext | null> {
  try {
    const { data, error } = await supabase
      .from('partner_members')
      .select(
        `partner_id, partners!inner(
           id, slug, name_en, name_jp, logo_url,
           primary_color, secondary_color, is_active
         )`,
      )
      .eq('user_id', authenticatedUserId)
      .eq('status', 'active')
      .eq('partners.is_active', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      // Message only. No row, no email, no user id, and no slug — Unit 5
      // provisions unlisted demo partners whose slugs are part of their
      // confidentiality posture.
      console.error('[partners] getActivePartnerContext failed:', error.message);
      return null;
    }
    if (!data) return null;

    // PostgREST may hand back the embed as an object or a single-element array
    // depending on inferred relationship metadata. Same flatten as
    // lib/courses/queries.ts:80-83.
    const rawPartner = (data as Record<string, unknown>).partners;
    const partner = (Array.isArray(rawPartner) ? rawPartner[0] ?? null : rawPartner ?? null) as
      | PartnerRow
      | null;

    if (!partner) return null;
    // `is_active` is always selected so this check is a no-op on the primary
    // path, and the sole change needed if the embedded filter above ever has to
    // be dropped for a PostgREST version that won't apply it.
    if (partner.is_active === false) return null;

    const name = (locale === 'ja' && partner.name_jp) || partner.name_en;
    const accent = safeAccentColorOn(partner.primary_color, LEARN_ZONE_SURFACES);
    const secondary = safeAccentColorOn(partner.secondary_color, LEARN_ZONE_SURFACES);

    return {
      partnerId: partner.id,
      slug: partner.slug,
      name,
      logoUrl: isRenderableRemoteImage(partner.logo_url) ? partner.logo_url : null,
      accent,
      accentSubtle: withAlpha(accent, 0.1),
      // Wash skips the 3:1 gate on purpose: it sits under nothing but --fg-primary
      // navy at >= 12:1 and is not a UI boundary. Only parseability is validated.
      accentWash:
        withAlpha(partner.secondary_color, MAX_WASH_ALPHA) ??
        withAlpha(secondary, MAX_WASH_ALPHA) ??
        withAlpha(accent, MAX_WASH_ALPHA),
    };
  } catch (e) {
    console.error(
      '[partners] getActivePartnerContext threw:',
      e instanceof Error ? e.message : String(e),
    );
    return null;
  }
}
