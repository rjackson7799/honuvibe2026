'use client';

import { SectionCard } from '@/components/admin/editor-shell/section-card';
import { labelClass, selectClass } from '@/components/admin/editor-shell/field-classes';
import type {
  VaultAccessTier,
  VaultDifficulty,
  VaultLanguage,
} from '@/lib/vault/types';
import { TRACK_IDS, type TrackId } from '@/lib/tracks';

const DIFFICULTIES: VaultDifficulty[] = ['beginner', 'intermediate', 'advanced'];
const LANGUAGES: VaultLanguage[] = ['en', 'ja', 'both'];
const ACCESS_TIERS: VaultAccessTier[] = ['free', 'premium'];

type ClassificationSectionProps = {
  difficulty: VaultDifficulty;
  setDifficulty: (v: VaultDifficulty) => void;
  language: VaultLanguage;
  setLanguage: (v: VaultLanguage) => void;
  accessTier: VaultAccessTier;
  setAccessTier: (v: VaultAccessTier) => void;
  track: TrackId | null;
  setTrack: (v: TrackId | null) => void;
  isFeatured: boolean;
  setIsFeatured: (v: boolean) => void;
};

export function ClassificationSection({
  difficulty,
  setDifficulty,
  language,
  setLanguage,
  accessTier,
  setAccessTier,
  track,
  setTrack,
  isFeatured,
  setIsFeatured,
}: ClassificationSectionProps) {
  return (
    <SectionCard id="classification" number={3} title="Classification">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass}>Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as VaultDifficulty)}
            className={selectClass}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as VaultLanguage)}
            className={selectClass}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Access Tier</label>
          <select
            value={accessTier}
            onChange={(e) => setAccessTier(e.target.value as VaultAccessTier)}
            className={selectClass}
          >
            {ACCESS_TIERS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="vault-track" className={labelClass}>Track</label>
          <select
            id="vault-track"
            value={track ?? ''}
            onChange={(e) => setTrack((e.target.value || null) as TrackId | null)}
            className={selectClass}
          >
            <option value="">None</option>
            {TRACK_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={isFeatured}
          onChange={(e) => setIsFeatured(e.target.checked)}
          className="h-4 w-4 rounded border-border-default bg-bg-tertiary text-accent-teal focus:ring-accent-teal"
        />
        <span className="text-sm text-fg-primary">Featured</span>
      </label>
    </SectionCard>
  );
}
