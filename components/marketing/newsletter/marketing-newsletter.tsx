import { HvContainer } from '../hv/container';
import { HvNewsletterBand } from '../hv/newsletter-band';

type MarketingNewsletterProps = {
  /**
   * Which page the signup came from (e.g. "home", "learn", "blog_post").
   * Forwarded to /api/newsletter/subscribe so Beehiiv can attribute it.
   */
  source: string;
};

/**
 * Newsletter band above the footer on every public page (README "Newsletter
 * — Join the wave."). Carries its own data-shell="hv" scope so it renders on
 * the green palette under pages whose body is still the legacy look; the
 * band itself is HvNewsletterBand (id="newsletter", so /#newsletter links land
 * on it).
 */
export function MarketingNewsletter({ source }: MarketingNewsletterProps) {
  return (
    <section data-shell="hv" className="pt-20 md:pt-24">
      <HvContainer>
        <HvNewsletterBand source={source} />
      </HvContainer>
    </section>
  );
}
