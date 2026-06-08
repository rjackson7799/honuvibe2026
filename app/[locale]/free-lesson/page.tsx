import { setRequestLocale } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { Section, Container } from '@/components/marketing/primitives';
import { Button } from '@/components/marketing/primitives/button';
import { WorkbenchBeforeAfter } from '@/components/marketing/free-lesson/workbench-before-after';
import { FreeLessonForm } from '@/components/marketing/free-lesson/free-lesson-form';
import { CONTENT, type FreeLessonLocale } from '@/lib/free-lesson/content';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const loc: FreeLessonLocale = locale === 'ja' ? 'ja' : 'en';
  return { title: CONTENT[loc].meta.title, description: CONTENT[loc].meta.description };
}

export default async function FreeLessonPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc: FreeLessonLocale = locale === 'ja' ? 'ja' : 'en';
  const c = CONTENT[loc];

  return (
    <MarketingShell>
      <MarketingNav />
      <main>
        {/* Hero */}
        <Section spacing="hero">
          <Container>
            <div className="mx-auto max-w-[720px] text-center">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
                {c.hero.overline}
              </p>
              <h1 className="text-[clamp(34px,5.5vw,58px)] font-bold leading-[1.05] tracking-[-0.025em] text-[var(--m-ink-primary)]">
                {c.hero.headline}
              </h1>
              <p className="mx-auto mt-6 max-w-[600px] text-[18px] leading-[1.6] text-[var(--m-ink-secondary)]">
                {c.hero.subhead}
              </p>
              <div className="mt-8">
                <Button href="#get-lesson" variant="primary-teal" withArrow>
                  {c.hero.cta}
                </Button>
              </div>
            </div>
          </Container>
        </Section>

        {/* The before/after sample */}
        <WorkbenchBeforeAfter locale={locale} />

        {/* Try it yourself */}
        <Section>
          <Container>
            <div className="mx-auto max-w-[680px]">
              <h2 className="mb-3 font-serif text-[clamp(24px,3vw,34px)] font-normal text-[var(--m-ink-primary)]">
                {c.tryIt.heading}
              </h2>
              <p className="mb-5 text-[16px] leading-[1.65] text-[var(--m-ink-secondary)]">
                {c.tryIt.body}
              </p>
              <pre className="overflow-x-auto rounded-[12px] border border-[var(--m-border)] bg-[var(--m-sand)] px-5 py-4 font-mono text-[13.5px] leading-[1.6] text-[var(--m-ink-primary)] whitespace-pre-wrap">
                {c.tryIt.starter}
              </pre>
            </div>
          </Container>
        </Section>

        {/* Capture */}
        <Section id="get-lesson" variant="sand">
          <Container>
            <div className="mx-auto max-w-[560px] text-center">
              <h2 className="mb-2 font-serif text-[clamp(24px,3vw,34px)] font-normal text-[var(--m-ink-primary)]">
                {c.capture.heading}
              </h2>
              <p className="mb-7 text-[16px] leading-[1.6] text-[var(--m-ink-secondary)]">
                {c.capture.subhead}
              </p>
              <FreeLessonForm />
            </div>
          </Container>
        </Section>

        {/* Next-step ladder */}
        <Section>
          <Container>
            <h2 className="mb-8 text-center font-serif text-[clamp(22px,2.6vw,30px)] font-normal text-[var(--m-ink-primary)]">
              {c.ladder.heading}
            </h2>
            <div className="grid gap-5 md:grid-cols-3">
              {c.ladder.items.map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                  className="group flex flex-col rounded-[16px] border border-[var(--m-border)] bg-[var(--m-white)] p-6 transition-all hover:-translate-y-0.5 hover:border-[var(--m-border-strong)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
                >
                  <p className="text-[18px] font-bold text-[var(--m-ink-primary)]">{item.title}</p>
                  <p className="mt-2 flex-1 text-[14.5px] leading-[1.55] text-[var(--m-ink-secondary)]">
                    {item.desc}
                  </p>
                  <span className="mt-4 text-[14px] font-semibold text-[var(--m-accent-teal)]">
                    {item.cta} →
                  </span>
                </a>
              ))}
            </div>
          </Container>
        </Section>
      </main>
      <MarketingFooter />
    </MarketingShell>
  );
}
