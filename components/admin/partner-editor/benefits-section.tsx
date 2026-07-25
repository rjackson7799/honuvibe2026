'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/admin/editor-shell/section-card';
import {
  inputClass,
  labelClass,
  selectClass,
  hintClass,
} from '@/components/admin/editor-shell/field-classes';
import type { PartnerBenefitsRow } from './types';

type Props = {
  partnerId: string;
  initialBenefits: PartnerBenefitsRow | null;
};

/**
 * Partner benefits.
 *
 * The Stripe coupon id is what actually discounts a checkout; the percentage is
 * display metadata and is never used for price math. The save endpoint verifies
 * the coupon against Stripe and warns when the two disagree.
 */
export function BenefitsSection({ partnerId, initialBenefits }: Props) {
  const [discount, setDiscount] = useState(
    String(initialBenefits?.course_discount_pct ?? 0),
  );
  const [couponId, setCouponId] = useState(initialBenefits?.stripe_coupon_id ?? '');
  const [includedTier, setIncludedTier] = useState(initialBenefits?.included_tier ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [warning, setWarning] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    setMessage('');
    setWarning('');
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/benefits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_discount_pct: Number(discount) || 0,
          stripe_coupon_id: couponId.trim() || null,
          included_tier: includedTier || null,
        }),
      });
      const data = (await res.json()) as { error?: string; warning?: string | null };
      if (!res.ok) {
        setError(data.error ?? 'Save failed');
        return;
      }
      setMessage('Benefits saved');
      if (data.warning) setWarning(data.warning);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard id="benefits" number={8} title="Benefits">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Course discount % (display only)</span>
          <input
            className={inputClass}
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
          <p className={hintClass}>
            Shown in copy. Never used to calculate a price.
          </p>
        </label>
        <label className="block">
          <span className={labelClass}>Stripe coupon id (authoritative)</span>
          <input
            className={inputClass}
            value={couponId}
            onChange={(e) => setCouponId(e.target.value)}
            placeholder="e.g. Kd8xQ2Lm"
          />
          <p className={hintClass}>
            Verified against Stripe when you save. This is what actually
            discounts a member&apos;s checkout.
          </p>
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Included tier — reserved, not yet active</span>
        <select
          className={selectClass}
          value={includedTier}
          onChange={(e) => setIncludedTier(e.target.value)}
        >
          <option value="">None</option>
          <option value="community">Community</option>
          <option value="vault">Vault</option>
        </select>
        <p className={hintClass}>
          Stored for the future flat-license model. Entitlement checks do not
          read it yet — grant Vault through a seat block instead.
        </p>
      </label>

      <div className="flex items-center gap-3">
        <Button variant="primary" size="sm" disabled={busy} onClick={() => void save()}>
          {busy ? 'Saving…' : 'Save benefits'}
        </Button>
        {message && <span className="text-sm text-accent-teal">{message}</span>}
      </div>

      {warning && <p className="text-sm text-[color:var(--accent-gold)]">{warning}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </SectionCard>
  );
}
