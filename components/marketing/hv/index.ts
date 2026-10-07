/**
 * 2026 green marketing design system — components/marketing/hv/
 * Handoff: docs/design_2026_green/README.md. Every component here uses only
 * --hv-* tokens and must render inside <MarketingShell theme="hv">.
 * The legacy components/marketing/primitives/* stay for pages not yet rebuilt.
 */
export { HvContainer } from './container';
export { HvSection } from './section';
export { HvEyebrow } from './eyebrow';
export { HvHeading } from './heading';
export { HvButton, type HvButtonVariant, type HvButtonSize } from './button';
export { HvBreadcrumb, type BreadcrumbItem } from './breadcrumb';
export { HvCard } from './card';
export { HvPill, HvPillToggle, type PillTone, type StaticPillTone } from './pill';
export { HvFaqAccordion, type FaqItem } from './faq-accordion';
export { HvTestimonialCarousel, type Testimonial } from './testimonial-carousel';
export { HvTierCard, HvTierGrid, type TierCardProps, type TierPrice } from './tier-cards';
export { HvNewsletterBand } from './newsletter-band';
export { HvCtaBand } from './cta-band';
export { HvLangToggle } from './lang-toggle';
export { HvRotatingWord } from './motion/rotating-word';
export { HvMarquee } from './motion/marquee';
export { HvReveal } from './motion/reveal';
export { useReducedMotion, prefersReducedMotion } from './motion/use-reduced-motion';
export { HvField, HvInput, HvTextarea, type FieldTone } from './forms/field';
export { HvPillGroup, type PillOption } from './forms/pill-group';
export { HvLeadFormShell, HvLeadFormPanel, HvLeadFormSuccess } from './forms/lead-form-shell';
