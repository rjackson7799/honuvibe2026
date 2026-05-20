import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';

export function LearnStartTonight() {
  const t = useTranslations('learn.start_tonight');

  const cards = [
    {
      label: t('card_vault_label'),
      price: t('card_vault_price'),
      cta: t('card_vault_cta'),
      href: '/learn/auth?intent=vault',
      tone: 'teal' as const,
    },
    {
      label: t('card_courses_label'),
      price: t('card_courses_price'),
      cta: t('card_courses_cta'),
      href: '#courses',
      tone: 'teal' as const,
    },
    {
      label: t('card_private_label'),
      price: t('card_private_price'),
      cta: t('card_private_cta'),
      href: '/partnerships',
      tone: 'coral' as const,
    },
  ];

  return (
    <Section variant="navy">
      <Container>
        <div className="mx-auto max-w-[760px] text-center">
          <p className="mb-4 inline-flex items-center gap-3 text-[11.5px] font-bold uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
            <span className="h-px w-8 bg-[var(--m-accent-teal)]/40" aria-hidden />
            {t('eyebrow')}
            <span className="h-px w-8 bg-[var(--m-accent-teal)]/40" aria-hidden />
          </p>
          <h2
            className="font-serif italic leading-[1.05] tracking-[-0.015em] text-white"
            style={{ fontSize: 'clamp(40px, 5.5vw, 68px)' }}
          >
            {t('headline')}
          </h2>
          <p className="mx-auto mt-7 max-w-[580px] text-[16px] leading-[1.7] text-white/90">
            {t('body')}
          </p>
          <p className="mt-4 text-[13.5px] font-semibold uppercase tracking-[0.06em] text-white/80">
            {t('refund_line')}
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {cards.map((card) => (
            <a
              key={card.label}
              href={card.href}
              className="group rounded-2xl border border-white/10 bg-white/[0.04] p-7 transition-all hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.07]"
            >
              <p
                className={
                  card.tone === 'teal'
                    ? 'text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--m-accent-teal)]'
                    : 'text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--m-accent-coral)]'
                }
              >
                {card.label}
              </p>
              <p className="mt-3 text-[28px] font-bold leading-none tracking-[-0.02em] text-white">
                {card.price}
              </p>
              <span
                className={
                  card.tone === 'teal'
                    ? 'mt-6 inline-flex items-center gap-2 text-[14.5px] font-bold text-[var(--m-accent-teal)] transition-transform group-hover:translate-x-0.5'
                    : 'mt-6 inline-flex items-center gap-2 text-[14.5px] font-bold text-[var(--m-accent-coral)] transition-transform group-hover:translate-x-0.5'
                }
              >
                {card.cta}
                <ArrowRight size={15} strokeWidth={2} />
              </span>
            </a>
          ))}
        </div>
      </Container>
    </Section>
  );
}
