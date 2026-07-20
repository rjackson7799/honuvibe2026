'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';
import { cn } from '@/lib/utils';

// a === null → the answer is composed from the shared billing_policy namespace
// (cancellation + refund), so those policy strings can't drift between the FAQ
// and the final CTA.
const ITEMS = [
  { q: 'q_1', a: 'a_1' },
  { q: 'q_2', a: 'a_2' },
  { q: 'q_3', a: 'a_3' },
  { q: 'q_4', a: 'a_4' },
  { q: 'q_5', a: null },
] as const;

export function HomeFaq() {
  const t = useTranslations('home.faq');
  const tPolicy = useTranslations('billing_policy');
  const locale = useLocale();
  const isEn = locale === 'en';
  const [open, setOpen] = useState(0);

  return (
    <Section variant="canvas">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2
              className="text-[clamp(30px,4vw,44px)] leading-[1.1] tracking-[-0.015em] text-[var(--m-ink-primary)]"
              style={{ fontFamily: 'var(--font-dm-serif)', fontWeight: 400 }}
            >
              {t.rich('heading', {
                em: (chunks) => (
                  <span className={cn('text-[var(--m-seafoam)]', isEn && 'italic')}>
                    {chunks}
                  </span>
                ),
              })}
            </h2>
          </div>

          <div className="lg:col-span-7">
            <dl className="divide-y divide-[var(--m-border-soft)] border-y border-[var(--m-border-soft)]">
              {ITEMS.map((item, i) => {
                const isOpen = open === i;
                const btnId = `home-faq-btn-${i}`;
                const panelId = `home-faq-panel-${i}`;
                const answer = item.a
                  ? t(item.a)
                  : `${tPolicy('cancel')} ${tPolicy('refund')}`;

                return (
                  <div key={item.q}>
                    <dt>
                      <button
                        id={btnId}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpen(isOpen ? -1 : i)}
                        className="flex min-h-[44px] w-full items-center justify-between gap-4 py-5 text-left text-[16.5px] font-bold tracking-[-0.005em] text-[var(--m-ink-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--m-canvas)]"
                      >
                        <span>{t(item.q)}</span>
                        <Plus
                          size={18}
                          strokeWidth={2}
                          aria-hidden
                          className={cn(
                            'shrink-0 text-[var(--m-accent-teal)] transition-transform duration-200 motion-reduce:transition-none',
                            isOpen && 'rotate-45',
                          )}
                        />
                      </button>
                    </dt>
                    <dd
                      id={panelId}
                      role="region"
                      aria-labelledby={btnId}
                      hidden={!isOpen}
                      className="pb-6 pr-8 text-[14.5px] leading-[1.75] text-[var(--m-ink-secondary)]"
                    >
                      {answer}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </Container>
    </Section>
  );
}
