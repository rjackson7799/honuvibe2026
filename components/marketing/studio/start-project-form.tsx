'use client';

import { useState } from 'react';

const INDUSTRIES = [
  { v: 'creator', l: 'Creator' },
  { v: 'healthcare', l: 'Healthcare' },
  { v: 'service', l: 'Service Business' },
  { v: 'professional', l: 'Professional' },
  { v: 'other', l: 'Other' },
];

const PROJECT_TYPES = [
  { v: 'starter', l: 'Studio Starter' },
  { v: 'pro', l: 'Studio Pro' },
  { v: 'ai_native', l: 'Studio AI-Native' },
  { v: 'not_sure', l: 'Not sure yet' },
];

const BUDGETS = [
  { v: 'under_1k', l: 'Under $1k' },
  { v: '1k_3k', l: '$1k – $3k' },
  { v: '3k_7k', l: '$3k – $7k' },
  { v: '7k_15k', l: '$7k – $15k' },
  { v: '15k_plus', l: '$15k+' },
];

const TIMELINES = [
  { v: 'asap', l: 'As soon as possible' },
  { v: '1_month', l: 'Within a month' },
  { v: '1_3_months', l: '1–3 months' },
  { v: 'flexible', l: 'Flexible' },
];

type Status = 'idle' | 'submitting' | 'ok' | 'error';

export function StartProjectForm() {
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());

    try {
      const res = await fetch('/api/studio-leads/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Request failed');
      setStatus('ok');
      form.reset();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'ok') {
    return (
      <div className="next-card" role="status">
        <span className="eyebrow coral">Got it</span>
        <h3 style={{ marginTop: 14 }}>Thanks — your project is in.</h3>
        <p className="muted" style={{ marginTop: 12 }}>
          We&apos;ve sent a confirmation to your inbox and we&apos;ll reply within
          one business day with a plan, a tier recommendation, and next steps.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="field-row">
        <div className="field">
          <label htmlFor="full_name">Name</label>
          <input id="full_name" name="full_name" required autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="company">Company / project name</label>
        <input id="company" name="company" required />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="industry">Industry</label>
          <select id="industry" name="industry" defaultValue="">
            <option value="" disabled>
              Choose one…
            </option>
            {INDUSTRIES.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="project_type">Project type</label>
          <select id="project_type" name="project_type" defaultValue="">
            <option value="" disabled>
              Choose one…
            </option>
            {PROJECT_TYPES.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="budget_range">
            Budget range <span className="opt">(optional)</span>
          </label>
          <select id="budget_range" name="budget_range" defaultValue="">
            <option value="">No preference</option>
            {BUDGETS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="timeline">
            Timeline <span className="opt">(optional)</span>
          </label>
          <select id="timeline" name="timeline" defaultValue="">
            <option value="">No preference</option>
            {TIMELINES.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="message">Tell us about your project</label>
        <textarea id="message" name="message" required placeholder="What are you building, and what would success look like?" />
      </div>

      <div className="field">
        <label htmlFor="referral_source">
          How did you hear about us? <span className="opt">(optional)</span>
        </label>
        <input id="referral_source" name="referral_source" />
      </div>

      <button type="submit" className="btn btn-coral btn-lg" disabled={status === 'submitting'} style={{ width: '100%' }}>
        {status === 'submitting' ? 'Sending…' : 'Start a Project'}
      </button>

      {status === 'error' && (
        <p className="form-status err">
          Something went wrong sending that. Email{' '}
          <a href="mailto:hello@honuvibe.ai" style={{ color: 'var(--coral-deep)' }}>
            hello@honuvibe.ai
          </a>{' '}
          and we&apos;ll pick it up.
        </p>
      )}
      <p className="form-note">We reply within one business day. No spam, ever.</p>
    </form>
  );
}
