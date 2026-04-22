'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Course, CourseLevel } from '@/lib/courses/types';
import type { CourseProposalInput } from '@/lib/instructor-portal/types';

type Props = {
  mode: 'create' | 'edit';
  course?: Course;
};

const LEVELS: CourseLevel[] = ['beginner', 'intermediate', 'advanced'];

function ensureRows(arr: string[] | null | undefined, min: number): string[] {
  const rows = (arr ?? []).map((s) => String(s));
  while (rows.length < min) rows.push('');
  return rows;
}

export function InstructorCourseProposalForm({ mode, course }: Props) {
  const router = useRouter();

  const [titleEn, setTitleEn] = useState(course?.title_en ?? '');
  const [descriptionEn, setDescriptionEn] = useState(course?.description_en ?? '');
  const [level, setLevel] = useState<CourseLevel>(course?.level ?? 'beginner');
  const [outcomes, setOutcomes] = useState<string[]>(
    ensureRows(course?.learning_outcomes_en, 3),
  );
  const [audience, setAudience] = useState<string[]>(
    ensureRows(course?.who_is_for_en, 1),
  );
  const [tools, setTools] = useState<string>(
    Array.isArray(course?.tools_covered) ? course!.tools_covered!.join(', ') : '',
  );
  const [priceUsd, setPriceUsd] = useState<string>(
    course?.price_usd != null ? (course.price_usd / 100).toFixed(2) : '',
  );
  const [priceJpy, setPriceJpy] = useState<string>(
    course?.price_jpy != null ? String(course.price_jpy) : '',
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildPayload(): CourseProposalInput {
    return {
      title_en: titleEn,
      description_en: descriptionEn,
      level,
      learning_outcomes_en: outcomes.map((s) => s.trim()).filter(Boolean),
      who_is_for_en: audience.map((s) => s.trim()).filter(Boolean),
      tools_covered: tools
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      price_usd: Number(priceUsd) || 0,
      price_jpy: Number(priceJpy) || 0,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = buildPayload();
      const url =
        mode === 'create'
          ? '/api/instructor/courses'
          : `/api/instructor/courses/${course!.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(body.error ?? 'Request failed');
      }
      router.push('/instructor/courses');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-[700px]">
      <Field label="Course title">
        <input
          type="text"
          value={titleEn}
          onChange={(e) => setTitleEn(e.target.value)}
          required
          maxLength={120}
          placeholder="e.g. Build a SaaS with Claude Code in 4 weeks"
          className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
        />
      </Field>

      <Field label="Short description" hint="Two or three sentences. Sells the outcome.">
        <textarea
          value={descriptionEn}
          onChange={(e) => setDescriptionEn(e.target.value)}
          required
          rows={3}
          maxLength={400}
          placeholder="A concise pitch — what students leave with, how the format works."
          className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal resize-y"
        />
        <p className="mt-1 text-[11px] text-fg-tertiary">{descriptionEn.length}/400</p>
      </Field>

      <Field label="Level">
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as CourseLevel)}
          className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l[0].toUpperCase() + l.slice(1)}
            </option>
          ))}
        </select>
      </Field>

      <Repeater
        label="Learning outcomes"
        hint="At least 3. Start each with a verb — Build, Ship, Understand…"
        values={outcomes}
        onChange={setOutcomes}
        minRows={3}
        placeholder="e.g. Ship a working agent in week 1"
      />

      <Repeater
        label="Who is it for"
        hint="One persona per row. Be concrete."
        values={audience}
        onChange={setAudience}
        minRows={1}
        placeholder="e.g. Solo founders shipping AI features"
      />

      <Field label="Tools covered" hint="Comma-separated (optional).">
        <input
          type="text"
          value={tools}
          onChange={(e) => setTools(e.target.value)}
          placeholder="Claude Code, Next.js, Supabase"
          className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Proposed price (USD)" hint="In dollars.">
          <input
            type="number"
            min={0}
            step="1"
            value={priceUsd}
            onChange={(e) => setPriceUsd(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
          />
        </Field>
        <Field label="Proposed price (JPY)" hint="In yen, no decimals.">
          <input
            type="number"
            min={0}
            step="100"
            value={priceJpy}
            onChange={(e) => setPriceJpy(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
          />
        </Field>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy
            ? 'Saving…'
            : mode === 'create'
              ? 'Submit proposal for review'
              : 'Save changes'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/instructor/courses')}
          disabled={busy}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-fg-tertiary block mb-1">
        {label}
      </span>
      {children}
      {hint && <p className="mt-1 text-[11px] text-fg-tertiary">{hint}</p>}
    </label>
  );
}

function Repeater({
  label,
  hint,
  values,
  onChange,
  minRows,
  placeholder,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (v: string[]) => void;
  minRows: number;
  placeholder?: string;
}) {
  function update(i: number, v: string) {
    const next = [...values];
    next[i] = v;
    onChange(next);
  }
  function remove(i: number) {
    if (values.length <= minRows) {
      const next = [...values];
      next[i] = '';
      onChange(next);
      return;
    }
    onChange(values.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...values, '']);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</span>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-xs text-accent-teal hover:underline"
        >
          <Plus size={12} /> Add row
        </button>
      </div>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={v}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove row"
              className="p-2 rounded-lg text-fg-tertiary hover:text-fg-primary hover:bg-bg-tertiary"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      {hint && <p className="mt-1 text-[11px] text-fg-tertiary">{hint}</p>}
    </div>
  );
}
