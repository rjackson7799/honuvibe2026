'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2, ExternalLink, GripVertical, X, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type PartnerFormData = {
  id: string;
  slug: string;
  name_en: string;
  name_jp: string;
  tagline_en: string;
  tagline_jp: string;
  description_en: string;
  description_jp: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  website_url: string;
  contact_email: string;
  revenue_share_pct: number;
  is_public: boolean;
  is_active: boolean;
};

export type CourseOption = {
  id: string;
  slug: string;
  title_en: string;
  is_published: boolean;
};

type Props = {
  partner: PartnerFormData;
  featuredCourseIds: string[];
  courseOptions: CourseOption[];
  enrollmentCount: number;
};

export function AdminPartnerForm({
  partner,
  featuredCourseIds,
  courseOptions,
  enrollmentCount,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState<PartnerFormData>(partner);
  const [courseIds, setCourseIds] = useState<string[]>(featuredCourseIds);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  function patch<K extends keyof PartnerFormData>(key: K, value: PartnerFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCourse(id: string) {
    setCourseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function moveCourse(id: string, direction: -1 | 1) {
    setCourseIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + direction;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage('');
    setSaveError('');
    try {
      const res = await fetch(`/api/admin/partners/${form.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: form.slug,
          name_en: form.name_en,
          name_jp: form.name_jp,
          tagline_en: form.tagline_en,
          tagline_jp: form.tagline_jp,
          description_en: form.description_en,
          description_jp: form.description_jp,
          logo_url: form.logo_url,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
          website_url: form.website_url,
          contact_email: form.contact_email,
          revenue_share_pct: Number(form.revenue_share_pct) || 0,
          is_public: form.is_public,
          is_active: form.is_active,
          featured_course_ids: courseIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? 'Save failed');
        return;
      }

      setSaveMessage('Saved');
      router.refresh();
      setTimeout(() => setSaveMessage(''), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!confirm('Deactivate this partner? The landing page will 404 and new enrollments will not be attributed. Existing enrollment records are preserved.')) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/partners/${form.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error ?? 'Deactivate failed');
        return;
      }
      router.push('/admin/partners');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Deactivate failed');
    } finally {
      setSaving(false);
    }
  }

  const featuredCourses = courseIds
    .map((id) => courseOptions.find((c) => c.id === id))
    .filter((c): c is CourseOption => Boolean(c));

  const availableCourses = courseOptions.filter((c) => !courseIds.includes(c.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href="/admin/partners"
          className="inline-flex items-center gap-1.5 text-sm text-fg-tertiary hover:text-fg-primary"
        >
          <ArrowLeft size={14} />
          All partners
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/partners/${form.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent-teal hover:underline"
          >
            View landing <ExternalLink size={14} />
          </Link>
          <Link
            href={`/admin/partners/${form.id}/enrollments`}
            className="inline-flex items-center gap-1.5 text-sm text-fg-secondary hover:text-fg-primary"
          >
            Enrollments ({enrollmentCount})
          </Link>
        </div>
      </div>

      <header>
        <h1 className="font-serif text-2xl text-fg-primary">{form.name_en}</h1>
        <p className="text-sm text-fg-tertiary font-mono mt-1">{form.slug}</p>
      </header>

      {/* Identity */}
      <Section title="Identity">
        <Grid>
          <Field label="Slug">
            <input
              type="text"
              value={form.slug}
              onChange={(e) => patch('slug', e.target.value)}
              pattern="[a-z0-9-]+"
              className={inputClass}
            />
          </Field>
          <Field label="Revenue share (%)">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.revenue_share_pct}
              onChange={(e) => patch('revenue_share_pct', Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Name (EN)">
            <input
              type="text"
              value={form.name_en}
              onChange={(e) => patch('name_en', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Name (JP)">
            <input
              type="text"
              value={form.name_jp}
              onChange={(e) => patch('name_jp', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Tagline (EN)">
            <input
              type="text"
              value={form.tagline_en}
              onChange={(e) => patch('tagline_en', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Tagline (JP)">
            <input
              type="text"
              value={form.tagline_jp}
              onChange={(e) => patch('tagline_jp', e.target.value)}
              className={inputClass}
            />
          </Field>
        </Grid>
        <Field label="Description (EN)">
          <textarea
            value={form.description_en}
            onChange={(e) => patch('description_en', e.target.value)}
            rows={3}
            className={textareaClass}
          />
        </Field>
        <Field label="Description (JP)">
          <textarea
            value={form.description_jp}
            onChange={(e) => patch('description_jp', e.target.value)}
            rows={3}
            className={textareaClass}
          />
        </Field>
      </Section>

      {/* Branding */}
      <Section title="Branding">
        <Grid>
          <Field label="Logo URL">
            <input
              type="url"
              value={form.logo_url}
              onChange={(e) => patch('logo_url', e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </Field>
          <Field label="Website URL">
            <input
              type="url"
              value={form.website_url}
              onChange={(e) => patch('website_url', e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </Field>
          <Field label="Primary color (hex)">
            <ColorInput
              value={form.primary_color}
              onChange={(v) => patch('primary_color', v)}
            />
          </Field>
          <Field label="Secondary color (hex)">
            <ColorInput
              value={form.secondary_color}
              onChange={(v) => patch('secondary_color', v)}
            />
          </Field>
          <Field label="Contact email">
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => patch('contact_email', e.target.value)}
              className={inputClass}
            />
          </Field>
        </Grid>
      </Section>

      {/* Visibility */}
      <Section title="Visibility">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Toggle
            label="Active"
            description="Inactive partners return 404 and do not capture attribution"
            value={form.is_active}
            onChange={(v) => patch('is_active', v)}
          />
          <Toggle
            label="Public (indexable)"
            description="When off, the landing page sets robots: noindex. Use for invite-only / pre-launch demos."
            value={form.is_public}
            onChange={(v) => patch('is_public', v)}
          />
        </div>
      </Section>

      {/* Featured courses */}
      <Section title="Featured courses">
        <p className="text-xs text-fg-tertiary -mt-2">
          These courses appear on <span className="font-mono">/partners/{form.slug}</span> in the order shown below.
        </p>
        {featuredCourses.length === 0 ? (
          <p className="text-sm text-fg-tertiary">No courses featured yet. Pick from the list below.</p>
        ) : (
          <ul className="space-y-1.5">
            {featuredCourses.map((c, idx) => (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded border border-border-default bg-bg-secondary px-3 py-2"
              >
                <GripVertical size={14} className="text-fg-tertiary shrink-0" />
                <span className="flex-1 text-sm text-fg-primary truncate">{c.title_en}</span>
                <span className="text-[11px] font-mono text-fg-tertiary">{c.slug}</span>
                {!c.is_published && (
                  <span className="text-[10px] uppercase tracking-wider text-amber-500">unpublished</span>
                )}
                <button
                  type="button"
                  onClick={() => moveCourse(c.id, -1)}
                  disabled={idx === 0}
                  className="text-xs text-fg-secondary hover:text-fg-primary disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveCourse(c.id, 1)}
                  disabled={idx === featuredCourses.length - 1}
                  className="text-xs text-fg-secondary hover:text-fg-primary disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => toggleCourse(c.id)}
                  className="text-fg-tertiary hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {availableCourses.length > 0 && (
          <details className="rounded border border-border-default bg-bg-secondary">
            <summary className="cursor-pointer px-3 py-2 text-sm text-fg-secondary">
              Add courses ({availableCourses.length} available)
            </summary>
            <ul className="border-t border-border-default max-h-60 overflow-y-auto">
              {availableCourses.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-2 px-3 py-2 border-b border-border-default last:border-0 hover:bg-bg-tertiary"
                >
                  <span className="flex-1 text-sm text-fg-primary truncate">{c.title_en}</span>
                  <span className="text-[11px] font-mono text-fg-tertiary">{c.slug}</span>
                  {!c.is_published && (
                    <span className="text-[10px] uppercase tracking-wider text-amber-500">unpublished</span>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => toggleCourse(c.id)}>
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Section>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border-default flex-wrap">
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} icon={Save} iconPosition="left">
            {saving ? 'Saving…' : 'Save'}
          </Button>
          {saveMessage && <span className="text-sm text-green-500">{saveMessage}</span>}
          {saveError && <span className="text-sm text-red-500">{saveError}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/api/admin/partners/${form.id}/enrollments/csv`}
            className="inline-flex items-center gap-1.5 text-sm text-fg-secondary hover:text-fg-primary"
          >
            <FileDown size={14} /> Export CSV
          </Link>
          {form.is_active && (
            <Button variant="ghost" size="sm" icon={Trash2} iconPosition="left" onClick={handleDeactivate}>
              Deactivate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Presentational helpers ───────────────────────────────── */

const inputClass =
  'h-10 px-3 rounded border border-border-default bg-bg-primary text-fg-primary text-base w-full';
const textareaClass =
  'px-3 py-2 rounded border border-border-default bg-bg-primary text-fg-primary text-base w-full';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-serif text-lg text-fg-primary">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-fg-secondary">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded border border-border-default bg-bg-secondary p-3 cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-accent-teal"
      />
      <span className="flex-1">
        <span className="block text-sm text-fg-primary font-medium">{label}</span>
        {description && (
          <span className="block text-xs text-fg-tertiary mt-0.5">{description}</span>
        )}
      </span>
    </label>
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const displayValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 rounded border border-border-default cursor-pointer bg-bg-primary"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#FF3366"
        className={inputClass}
      />
    </div>
  );
}
