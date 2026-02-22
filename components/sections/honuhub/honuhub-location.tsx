'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline, Button } from '@/components/ui';
import { MapPin, Clock, Car, Send } from 'lucide-react';

export function HonuHubLocation() {
  const t = useTranslations('honuhub_page.location');
  const tc = useTranslations('honuhub_page.contact');
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    type: 'group',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('loading');
    // Placeholder — will wire to API later
    setTimeout(() => setFormState('success'), 1000);
  };

  return (
    <Section id="location">
      <Container size="wide">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Map + Info */}
          <div className="flex flex-col gap-6">
            <Overline>{t('overline')}</Overline>
            <h2 className="font-serif text-h2 text-fg-primary">{t('heading')}</h2>

            {/* Map placeholder */}
            <div className="aspect-[4/3] rounded-xl bg-bg-secondary border border-border-default overflow-hidden">
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <MapPin size={28} className="text-accent-teal/50" />
                  <span className="text-sm text-fg-tertiary">Google Maps</span>
                </div>
              </div>
            </div>

            {/* Location details */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-accent-teal mt-0.5 shrink-0" />
                <p className="text-sm text-fg-secondary">{t('address')}</p>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={18} className="text-accent-teal mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-fg-primary mb-1">{t('hours_title')}</p>
                  <p className="text-sm text-fg-secondary">{t('hours')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Car size={18} className="text-accent-teal mt-0.5 shrink-0" />
                <p className="text-sm text-fg-secondary">{t('parking')}</p>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="flex flex-col gap-4">
            <h3 className="font-serif text-h3 text-fg-primary">{t('contact_title')}</h3>
            <p className="text-sm text-fg-secondary">{t('contact_description')}</p>

            {formState === 'success' ? (
              <div className="rounded-xl border border-accent-teal/30 bg-accent-teal-subtle p-8 text-center">
                <p className="text-base text-accent-teal">{tc('success')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-fg-secondary">{tc('name_label')}</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={tc('name_placeholder')}
                    className="h-12 w-full rounded bg-bg-tertiary px-4 text-[16px] text-fg-primary border border-border-default placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors duration-[var(--duration-fast)]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-fg-secondary">{tc('email_label')}</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={tc('email_placeholder')}
                    className="h-12 w-full rounded bg-bg-tertiary px-4 text-[16px] text-fg-primary border border-border-default placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors duration-[var(--duration-fast)]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-fg-secondary">{tc('type_label')}</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="h-12 w-full rounded bg-bg-tertiary px-4 text-[16px] text-fg-primary border border-border-default focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors duration-[var(--duration-fast)] appearance-none"
                  >
                    <option value="group">{tc('type_options.group')}</option>
                    <option value="corporate">{tc('type_options.corporate')}</option>
                    <option value="partnership">{tc('type_options.partnership')}</option>
                    <option value="other">{tc('type_options.other')}</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-fg-secondary">{tc('message_label')}</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={tc('message_placeholder')}
                    className="w-full rounded bg-bg-tertiary px-4 py-3 text-[16px] text-fg-primary border border-border-default placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors duration-[var(--duration-fast)] resize-none"
                  />
                </div>

                <Button
                  variant="primary"
                  type="submit"
                  disabled={formState === 'loading'}
                  icon={Send}
                  iconPosition="right"
                >
                  {tc('submit')}
                </Button>

                {formState === 'error' && (
                  <p className="text-sm text-red-400">{tc('error')}</p>
                )}
              </form>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
