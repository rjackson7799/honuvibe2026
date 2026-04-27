import { useTranslations } from 'next-intl';
import { BookOpen, Check, Key, Users } from 'lucide-react';
import {
  Badge,
  Button,
  Container,
  Section,
} from '@/components/marketing/primitives';
import { cn } from '@/lib/utils';

export function LearnThreePaths() {
  return (
    <Section variant="canvas" spacing="flush" className="pb-20 md:pb-24">
      <Container>
        <div className="grid items-start gap-6 md:grid-cols-3">
          <CoursesCard />
          <VaultCard />
          <PrivateCard />
        </div>
      </Container>
    </Section>
  );
}

function Bullet({ children, tone = 'teal' }: { children: React.ReactNode; tone?: 'teal' | 'coral' }) {
  return (
    <li className="mb-2.5 flex items-start gap-2.5 text-[14.5px] leading-[1.5] text-[var(--m-ink-secondary)]">
      <Check
        size={15}
        strokeWidth={2}
        className={cn(
          'mt-0.5 shrink-0',
          tone === 'teal' ? 'text-[var(--m-accent-teal)]' : 'text-[var(--m-accent-coral)]',
        )}
      />
      <span>{children}</span>
    </li>
  );
}

function VaultCard() {
  const t = useTranslations('learn.three_paths');
  return (
    <div className="relative -translate-y-1 rounded-2xl border-[1.5px] border-[var(--m-accent-teal)] bg-[var(--m-white)] p-8 shadow-[0_10px_40px_rgba(15,169,160,0.12)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_64px_rgba(15,169,160,0.18)]">
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--m-accent-teal)] px-4 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-white">
        {t('vault_pop_ribbon')}
      </span>
      <BookOpen size={22} strokeWidth={1.5} className="mb-4 text-[var(--m-accent-teal)]" />
      <Badge tone="info" className="mb-4">{t('vault_badge')}</Badge>
      <h2 className="mb-3 text-[26px] font-bold leading-tight tracking-[-0.015em] text-[var(--m-ink-primary)]">
        {t('vault_title')}
      </h2>
      <p className="mb-6 text-[15px] leading-[1.7] text-[var(--m-ink-secondary)]">
        {t('vault_body')}
      </p>
      <ul className="mb-7 list-none p-0">
        <Bullet>{t('vault_bullet_1')}</Bullet>
        <Bullet>{t('vault_bullet_2')}</Bullet>
        <Bullet>{t('vault_bullet_3')}</Bullet>
      </ul>
      <div className="mb-5">
        <p className="mb-0.5 text-[13px] text-[var(--m-ink-tertiary)] line-through">
          {t('vault_price_old')}
        </p>
        <p className="text-[22px] font-bold leading-none text-[var(--m-ink-primary)]">
          {t('vault_price_new')}
          <span className="text-[14px] font-medium text-[var(--m-ink-secondary)]">
            {t('vault_price_period')}
          </span>
        </p>
        <p className="mt-1 text-[12px] font-semibold text-[var(--m-accent-teal)]">
          {t('vault_price_caption')}
        </p>
      </div>
      <Button href="/learn#vault" variant="primary-teal" withArrow className="w-full">
        {t('vault_cta')}
      </Button>
    </div>
  );
}

function CoursesCard() {
  const t = useTranslations('learn.three_paths');
  return (
    <div className="rounded-2xl border border-[var(--m-border-soft)] bg-[var(--m-white)] p-8 shadow-[var(--m-shadow-xs)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--m-border-teal)] hover:shadow-[0_16px_48px_rgba(15,169,160,0.1)]">
      <Users size={22} strokeWidth={1.5} className="mb-4 text-[var(--m-accent-teal)]" />
      <Badge tone="info" className="mb-4">{t('courses_badge')}</Badge>
      <h2 className="mb-3 text-[26px] font-bold leading-tight tracking-[-0.015em] text-[var(--m-ink-primary)]">
        {t('courses_title')}
      </h2>
      <p className="mb-6 text-[15px] leading-[1.7] text-[var(--m-ink-secondary)]">
        {t('courses_body')}
      </p>
      <ul className="mb-7 list-none p-0">
        <Bullet>{t('courses_bullet_1')}</Bullet>
        <Bullet>{t('courses_bullet_2')}</Bullet>
        <Bullet>{t('courses_bullet_3')}</Bullet>
      </ul>
      <p className="mb-5 text-[13px] font-medium text-[var(--m-ink-tertiary)]">
        {t('courses_price_label')}{' '}
        <strong className="text-[15px] text-[var(--m-ink-primary)]">
          {t('courses_price_value')}
        </strong>
      </p>
      <Button href="#catalog" variant="primary-teal" withArrow className="w-full">
        {t('courses_cta')}
      </Button>
    </div>
  );
}

function PrivateCard() {
  const t = useTranslations('learn.three_paths');
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--m-accent-coral)] bg-[var(--m-sand)] p-8 shadow-[var(--m-shadow-xs)] transition-all duration-300 hover:-translate-y-1 hover:border-[1.5px] hover:shadow-[0_16px_48px_rgba(232,118,90,0.12)]">
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: 'linear-gradient(90deg, var(--m-accent-coral), #c45a40)' }}
        aria-hidden
      />
      <Key size={22} strokeWidth={1.5} className="mb-4 text-[var(--m-accent-coral)]" />
      <Badge tone="by-application" className="mb-4">{t('private_badge')}</Badge>
      <h2 className="mb-3 text-[26px] font-bold leading-tight tracking-[-0.015em] text-[var(--m-ink-primary)]">
        {t('private_title')}
      </h2>
      <p className="mb-6 text-[15px] leading-[1.7] text-[var(--m-ink-secondary)]">
        {t('private_body')}
      </p>
      <ul className="mb-6 list-none p-0">
        <Bullet tone="coral">{t('private_bullet_1')}</Bullet>
        <Bullet tone="coral">{t('private_bullet_2')}</Bullet>
        <Bullet tone="coral">{t('private_bullet_3')}</Bullet>
      </ul>
      <div className="mb-6 flex flex-col gap-2 border-t border-[var(--m-border-default)] pt-4">
        {[t('private_partner_1'), t('private_partner_2')].map((p) => (
          <div key={p} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--m-accent-coral)]" aria-hidden />
            <span className="text-[12.5px] font-semibold text-[var(--m-ink-secondary)]">{p}</span>
          </div>
        ))}
      </div>
      <Button href="/partnerships" variant="outline-coral" withArrow className="w-full">
        {t('private_cta')}
      </Button>
    </div>
  );
}
