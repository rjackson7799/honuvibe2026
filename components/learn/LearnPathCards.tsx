'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading, Card, Button } from '@/components/ui';
import { GraduationCap, Lock, BookOpen, Bell, ArrowDown, ArrowRight } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

export function LearnPathCards() {
  const t = useTranslations('learn.paths');
  const [vaultEmail, setVaultEmail] = useState('');
  const [vaultStatus, setVaultStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleVaultNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultEmail) return;
    setVaultStatus('loading');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: vaultEmail }),
      });
      if (res.ok) {
        setVaultStatus('success');
        setVaultEmail('');
        trackEvent('newsletter_signup', { source_page: 'vault_waitlist' });
      } else {
        setVaultStatus('error');
      }
    } catch {
      setVaultStatus('error');
    }
  };

  const scrollToCourses = () => {
    document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Section noReveal className="!pt-0 !pb-8 md:!pb-12">
      <Container className="max-w-[1100px]">
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          sub={t('sub')}
          centered
        />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Courses */}
          <Card padding="lg" hover className="relative flex flex-col overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-accent-teal" />
            <div className="pt-2 flex-1 flex flex-col">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent-teal-subtle">
                <GraduationCap size={22} className="text-accent-teal" />
              </div>
              <h3 className="font-serif text-h3 text-fg-primary mb-2">
                {t('courses.title')}
              </h3>
              <p className="text-sm text-fg-secondary leading-relaxed mb-4 flex-1">
                {t('courses.description')}
              </p>
              <p className="text-sm text-fg-tertiary mb-6">
                {t('courses.price')}
              </p>
              <Button
                variant="primary"
                fullWidth
                icon={ArrowDown}
                iconPosition="right"
                onClick={scrollToCourses}
              >
                {t('courses.cta')}
              </Button>
            </div>
          </Card>

          {/* The Vault — Coming Soon */}
          <Card padding="lg" className="relative flex flex-col overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-accent-gold" />
            <div className="pt-2 flex-1 flex flex-col">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent-gold-subtle">
                <Lock size={22} className="text-accent-gold" />
              </div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-serif text-h3 text-fg-primary">
                  {t('vault.title')}
                </h3>
                <span className="inline-flex items-center rounded-full border border-accent-gold/30 bg-accent-gold-subtle px-3 py-0.5 text-xs font-medium text-accent-gold">
                  {t('vault.badge')}
                </span>
              </div>
              <p className="text-sm text-fg-secondary leading-relaxed mb-4 flex-1">
                {t('vault.description')}
              </p>
              <p className="text-sm text-fg-tertiary mb-6">
                {t('vault.price')}
              </p>
              {vaultStatus === 'success' ? (
                <p className="text-sm text-accent-teal text-center py-2">
                  {t('vault.success')}
                </p>
              ) : (
                <form onSubmit={handleVaultNotify} className="flex flex-col gap-2">
                  <label htmlFor="vault-email" className="sr-only">
                    {t('vault.placeholder')}
                  </label>
                  <input
                    id="vault-email"
                    type="email"
                    value={vaultEmail}
                    onChange={(e) => setVaultEmail(e.target.value)}
                    placeholder={t('vault.placeholder')}
                    required
                    className="h-11 w-full rounded bg-bg-tertiary px-4 text-[16px] text-fg-primary border border-border-default placeholder:text-fg-tertiary focus:border-accent-gold focus:outline-none focus:ring-1 focus:ring-accent-gold transition-colors duration-[var(--duration-fast)]"
                  />
                  <Button
                    variant="gold"
                    fullWidth
                    type="submit"
                    disabled={vaultStatus === 'loading'}
                    icon={Bell}
                    iconPosition="right"
                  >
                    {t('vault.cta')}
                  </Button>
                </form>
              )}
              {vaultStatus === 'error' && (
                <p className="mt-2 text-sm text-red-400">{t('vault.error')}</p>
              )}
            </div>
          </Card>

          {/* Library — Free */}
          <Card padding="lg" hover className="relative flex flex-col overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-territory-db" />
            <div className="pt-2 flex-1 flex flex-col">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-territory-db/12">
                <BookOpen size={22} className="text-territory-db" />
              </div>
              <h3 className="font-serif text-h3 text-fg-primary mb-2">
                {t('library.title')}
              </h3>
              <p className="text-sm text-fg-secondary leading-relaxed mb-4 flex-1">
                {t('library.description')}
              </p>
              <p className="text-sm font-medium text-accent-teal mb-6">
                {t('library.price')}
              </p>
              <Link href="/learn/library">
                <Button
                  variant="ghost"
                  fullWidth
                  icon={ArrowRight}
                  iconPosition="right"
                >
                  {t('library.cta')}
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </Container>
    </Section>
  );
}
