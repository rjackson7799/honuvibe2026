import Link from 'next/link';
import { Lock, ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function BusinessUpgradeGate({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'business_upgrades' });
  const prefix = locale === 'ja' ? '/ja' : '';
  return (
    <div className="rounded-2xl border border-border-default bg-bg-secondary p-7 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-teal/10 text-accent-teal">
        <Lock size={22} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-xl font-bold text-fg-primary">{t('gate_title')}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-fg-secondary">{t('gate_body')}</p>
      <Link href={`${prefix}/learn`} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent-teal px-5 py-3 text-sm font-semibold text-white">
        {t('gate_cta')} <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
