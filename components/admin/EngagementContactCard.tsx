'use client';

// The client contact block — the ONE editor the engagement row gets this
// slice. sendQuestionnaire requires client_contact_email, which slice 1 only
// seeds from the lead, so this lets Ryan fix a missing / wrong address (and
// the questionnaire language) in place. Existing panel chrome; useTransition +
// inline error like every other admin panel.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateEngagementContact } from '@/lib/studio/engagement/engagement-actions';
import type { Engagement } from '@/lib/admin/types';

const inputCls =
  'w-full px-3 py-2 min-h-[44px] rounded-lg bg-bg-primary border border-border-default text-fg-primary text-base sm:text-sm focus:border-accent-teal outline-none';
const labelCls = 'block text-[12px] font-semibold text-fg-secondary mb-1';
const ghostBtn =
  'inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-bg-primary border border-border-default text-fg-secondary text-[12.5px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors';

export function EngagementContactCard({ engagement }: { engagement: Engagement }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [name, setName] = useState(engagement.client_contact_name ?? '');
  const [email, setEmail] = useState(engagement.client_contact_email ?? '');
  const [locale, setLocale] = useState<'en' | 'ja'>(engagement.locale);

  function save() {
    setError('');
    startTransition(async () => {
      try {
        await updateEngagementContact(engagement.id, { client_contact_name: name, client_contact_email: email, locale });
        setEditing(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save the client contact.');
      }
    });
  }

  function cancel() {
    setName(engagement.client_contact_name ?? '');
    setEmail(engagement.client_contact_email ?? '');
    setLocale(engagement.locale);
    setError('');
    setEditing(false);
  }

  return (
    <section className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[14px] font-bold text-fg-primary">Client contact</h2>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className={ghostBtn}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} className={inputCls} placeholder="Who receives the questionnaire" />
            </label>
            <label className="block">
              <span className={labelCls}>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={320}
                className={inputCls}
                placeholder="client@example.com"
              />
            </label>
          </div>
          <label className="block sm:max-w-[240px]">
            <span className={labelCls}>Questionnaire language</span>
            <select value={locale} onChange={(e) => setLocale(e.target.value as 'en' | 'ja')} className={inputCls}>
              <option value="en">English</option>
              <option value="ja">Japanese</option>
            </select>
            <span className="mt-1 block text-[12px] text-fg-tertiary">Applies to questionnaires drafted from now on.</span>
          </label>
          {error && <p className="text-[13px] text-[color:var(--accent-coral)]">{error}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[12.5px] font-semibold shadow-sm disabled:opacity-50 transition-all"
            >
              {pending ? 'Saving…' : 'Save contact'}
            </button>
            <button type="button" onClick={cancel} disabled={pending} className={ghostBtn}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs text-fg-tertiary">Name</dt>
            <dd className="text-fg-secondary">{engagement.client_contact_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-fg-tertiary">Email</dt>
            <dd className={engagement.client_contact_email ? 'text-fg-secondary break-all' : 'text-[color:var(--accent-coral)] font-medium'}>
              {engagement.client_contact_email || 'Missing — needed to send the questionnaire'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-fg-tertiary">Language</dt>
            <dd className="text-fg-secondary">{engagement.locale === 'ja' ? 'Japanese' : 'English'}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
