import { useTranslations } from 'next-intl';
import { HvButton, HvContainer, HvEyebrow, HvHeading, HvMarquee } from '@/components/marketing/hv';

type Step = { title: string; body: string };

/** "Learn in the Vault": heading, the tools and topics marquees, and the three steps. */
export function HomeHowLearn() {
  const t = useTranslations('home.how');
  const steps = t.raw('steps') as Step[];

  return (
    <section id="how" className="pt-16 md:pt-20">
      <HvContainer>
        <div data-reveal>
          <HvEyebrow>{t('eyebrow')}</HvEyebrow>
          <div className="mt-2.5 flex flex-wrap items-end justify-between gap-5">
            <HvHeading level="h2" className="max-w-[22ch] text-hv-green-900 [text-wrap:balance] [word-break:auto-phrase]">
              {t('heading')}
            </HvHeading>
            <HvButton href="/learn" variant="outline" size="md" arrow className="whitespace-nowrap">
              {t('cta')}
            </HvButton>
          </div>
        </div>
      </HvContainer>

      <div data-reveal className="mx-auto mt-7 flex max-w-[var(--hv-container)] flex-col gap-2.5">
        <HvMarquee items={t.raw('marquee_tools') as string[]} tone="dark" label={t('marquee_tools_label')} />
        <HvMarquee items={t.raw('marquee_topics') as string[]} tone="light" reverse label={t('marquee_topics_label')} />
      </div>

      <HvContainer>
        <ol className="mt-9 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
          {steps.map((step, i) => (
            <li key={step.title} data-reveal data-reveal-delay={i * 140} className="flex flex-col gap-2">
              <span aria-hidden data-line className="mb-2.5 block h-0.5 origin-left bg-hv-green-900" />
              <span aria-hidden className="font-hv-display text-[14px] font-bold text-hv-terracotta">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="hv-display font-hv-display text-[22px] [word-break:auto-phrase] font-bold tracking-[-0.02em] text-hv-green-900">
                {step.title}
              </h3>
              <p className="max-w-[40ch] text-[15.5px] leading-[1.6] text-hv-ink-700">{step.body}</p>
            </li>
          ))}
        </ol>
      </HvContainer>
    </section>
  );
}
