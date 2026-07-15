import { ArrowRight } from 'lucide-react';
import { Button, Container, Section } from '@/components/marketing/primitives';

type FinalCtaLink = {
  href: string;
  label: string;
};

export function FinalCta({
  eyebrow,
  headline,
  body,
  note,
  primary,
  links,
  variant = 'navy',
}: {
  eyebrow: string;
  headline: string;
  body: string;
  note?: string;
  primary: FinalCtaLink;
  links: FinalCtaLink[];
  /** 'navy' = solid dark band (light pages). 'canvas' = transparent, for a
   *  page that already supplies a dark surface (e.g. the .about-ocean zone). */
  variant?: 'navy' | 'canvas';
}) {
  return (
    <Section variant={variant}>
      <Container>
        <div className="mx-auto max-w-[760px] text-center">
          <p className="mb-4 inline-flex items-center gap-3 text-[11.5px] font-bold uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
            <span className="h-px w-8 bg-[var(--m-accent-teal)]/40" aria-hidden />
            {eyebrow}
            <span className="h-px w-8 bg-[var(--m-accent-teal)]/40" aria-hidden />
          </p>
          <h2
            className="font-serif italic leading-[1.05] tracking-[-0.015em] text-white"
            style={{ fontSize: 'clamp(40px, 5.5vw, 68px)' }}
          >
            {headline}
          </h2>
          <p className="mx-auto mt-7 max-w-[580px] text-[16px] leading-[1.7] text-white/90">
            {body}
          </p>
          {note && (
            <p className="mt-4 text-[13.5px] font-semibold uppercase tracking-[0.06em] text-white/80">
              {note}
            </p>
          )}

          <div className="mt-9 flex justify-center">
            <Button href={primary.href} variant="primary-teal" size="lg" withArrow>
              {primary.label}
            </Button>
          </div>

          {links.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="group inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-white/85 transition-colors hover:text-white"
                >
                  {link.label}
                  <ArrowRight
                    size={15}
                    strokeWidth={2}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      </Container>
    </Section>
  );
}
