import { useTranslations } from 'next-intl';
import { Clock, Mail, MapPin } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';

const ITEMS = [
  { key: 'email', Icon: Mail },
  { key: 'location', Icon: MapPin },
  { key: 'response_time', Icon: Clock },
] as const;

export function ContactInfoStrip() {
  const t = useTranslations('contact.info_strip');

  return (
    <Section variant="canvas" spacing="flush" className="pb-16 md:pb-20">
      <Container>
        <div className="mx-auto grid max-w-[700px] grid-cols-1 overflow-hidden rounded-[14px] border border-[var(--m-border-soft)] bg-[var(--m-white)] md:grid-cols-3">
          {ITEMS.map(({ key, Icon }, i) => (
            <div
              key={key}
              className={
                'px-6 py-7 text-center ' +
                (i < ITEMS.length - 1
                  ? 'border-b border-[var(--m-border-soft)] md:border-b-0 md:border-r '
                  : '')
              }
            >
              <div className="mb-2.5 flex justify-center">
                <Icon
                  size={20}
                  strokeWidth={1.6}
                  className="text-[var(--m-accent-teal)]"
                />
              </div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--m-ink-tertiary)]">
                {t(`${key}_label`)}
              </p>
              <p className="text-[14px] font-medium text-[var(--m-ink-primary)]">
                {t(`${key}_detail`)}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
