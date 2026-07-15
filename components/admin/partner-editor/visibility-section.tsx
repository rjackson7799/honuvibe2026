'use client';

import { SectionCard } from '@/components/admin/editor-shell/section-card';
import { Toggle } from './fields';
import type { PartnerFormData, PatchFn } from './types';

type Props = {
  form: PartnerFormData;
  patch: PatchFn;
};

export function VisibilitySection({ form, patch }: Props) {
  return (
    <SectionCard id="visibility" number={3} title="Visibility">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
    </SectionCard>
  );
}
