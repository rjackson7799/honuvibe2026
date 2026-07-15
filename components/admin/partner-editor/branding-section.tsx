'use client';

import { SectionCard } from '@/components/admin/editor-shell/section-card';
import { inputClass } from '@/components/admin/editor-shell/field-classes';
import { ColorInput, Field, Grid } from './fields';
import type { PartnerFormData, PatchFn } from './types';

type Props = {
  form: PartnerFormData;
  patch: PatchFn;
};

export function BrandingSection({ form, patch }: Props) {
  return (
    <SectionCard id="branding" number={2} title="Branding">
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
    </SectionCard>
  );
}
