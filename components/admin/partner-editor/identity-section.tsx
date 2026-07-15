'use client';

import { SectionCard } from '@/components/admin/editor-shell/section-card';
import { inputClass, textareaClass } from '@/components/admin/editor-shell/field-classes';
import { Field, Grid } from './fields';
import type { PartnerFormData, PatchFn } from './types';

type Props = {
  form: PartnerFormData;
  patch: PatchFn;
};

export function IdentitySection({ form, patch }: Props) {
  return (
    <SectionCard id="identity" number={1} title="Identity">
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

      <Grid>
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
      </Grid>
    </SectionCard>
  );
}
