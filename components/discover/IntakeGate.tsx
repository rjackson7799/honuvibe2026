'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { discoverPath } from './paths';
import {
  INDUSTRY_OPTIONS,
  LOCATION_TYPE_OPTIONS,
  TIER_OPTIONS,
  type Option,
} from '@/lib/discover/labels';

interface FormState {
  name: string;
  email: string;
  business_name: string;
  industry: string;
  location_type: string;
  tier_interest: string;
  existing_url: string;
  consent: boolean;
}

const initial: FormState = {
  name: '',
  email: '',
  business_name: '',
  industry: '',
  location_type: '',
  tier_interest: 'not_sure',
  existing_url: '',
  consent: false,
};

export function IntakeGate() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canSubmit =
    form.name.trim() !== '' &&
    form.email.trim() !== '' &&
    form.business_name.trim() !== '' &&
    form.location_type !== '' &&
    form.consent &&
    !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/discover/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          business_name: form.business_name.trim(),
          industry: form.industry || null,
          location_type: form.location_type,
          tier_interest: form.tier_interest,
          existing_url: form.existing_url.trim() || null,
          source_locale: 'en',
          consent: true,
        }),
      });
      if (!res.ok) {
        setError('Something went wrong starting your project. Please try again.');
        setSubmitting(false);
        return;
      }
      const data: { sessionId: string; custom: boolean } = await res.json();
      const next = data.custom
        ? `/discover/${data.sessionId}/custom`
        : `/discover/${data.sessionId}`;
      router.push(discoverPath(next));
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="dsc-center">
      <p className="dsc-stepmark">Build It AI · Discovery</p>
      <h1 className="dsc-q__head">Let&rsquo;s build something.</h1>
      <p className="dsc-q__sub">
        A few quick details and we&rsquo;ll walk you through a calm, guided plan — with a clear
        price as we go. Free, no signup.
      </p>

      <form className="dsc-form" onSubmit={onSubmit} noValidate>
        <Field label="Your name">
          <input
            className="dsc-input"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            autoComplete="name"
            required
          />
        </Field>
        <Field label="Email">
          <input
            className="dsc-input"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Business name">
          <input
            className="dsc-input"
            value={form.business_name}
            onChange={(e) => set('business_name', e.target.value)}
            autoComplete="organization"
            required
          />
        </Field>

        <Field label="Industry">
          <Select
            value={form.industry}
            onChange={(v) => set('industry', v)}
            placeholder="Select one (optional)"
            options={INDUSTRY_OPTIONS}
          />
        </Field>

        <Field label="Where do customers find you?">
          <Select
            value={form.location_type}
            onChange={(v) => set('location_type', v)}
            placeholder="Select one"
            options={LOCATION_TYPE_OPTIONS}
          />
        </Field>

        <Field label="Which plan are you leaning toward?">
          <Select
            value={form.tier_interest}
            onChange={(v) => set('tier_interest', v)}
            options={TIER_OPTIONS}
          />
        </Field>

        <Field label="Current website (optional)">
          <input
            className="dsc-input"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={form.existing_url}
            onChange={(e) => set('existing_url', e.target.value)}
          />
        </Field>

        <label className="dsc-consent">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(e) => set('consent', e.target.checked)}
          />
          <span>
            By continuing you agree to our{' '}
            <a href="/legal/privacy" target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
            .
          </span>
        </label>

        {error && <p className="dsc-error">{error}</p>}

        <div style={{ marginTop: 24 }}>
          <button type="submit" className="dsc-btn dsc-btn--primary" disabled={!canSubmit}>
            {submitting ? 'Starting…' : 'Start'} <span aria-hidden>→</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="dsc-field">
      <span className="dsc-label">{label}</span>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
}) {
  return (
    <select className="dsc-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
