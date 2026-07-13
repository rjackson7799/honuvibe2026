'use client';

import { Languages } from 'lucide-react';
import { SectionCard } from './section-card';
import { inputClass, labelClass, textareaClass } from './field-classes';
import type { MachineField } from './machine-filled';

type CoreInfoSectionProps = {
  slug: string;
  setSlug: (v: string) => void;
  titleEn: string;
  setTitleEn: (v: string) => void;
  onTitleBlur: () => void;
  titleJp: string;
  setTitleJp: (v: string) => void;
  descriptionEn: string;
  setDescriptionEn: (v: string) => void;
  descriptionJp: string;
  setDescriptionJp: (v: string) => void;
  machineFilled: Set<MachineField>;
  translating: boolean;
  canTranslate: boolean;
  onTranslate: () => void;
};

function MachineTag({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="ml-2 text-[11px] font-semibold text-[color:var(--accent-gold)]">
      machine translated
    </span>
  );
}

export function CoreInfoSection({
  slug,
  setSlug,
  titleEn,
  setTitleEn,
  onTitleBlur,
  titleJp,
  setTitleJp,
  descriptionEn,
  setDescriptionEn,
  descriptionJp,
  setDescriptionJp,
  machineFilled,
  translating,
  canTranslate,
  onTranslate,
}: CoreInfoSectionProps) {
  return (
    <SectionCard
      id="core-info"
      number={1}
      title="Core info"
      meta={
        <button
          type="button"
          onClick={onTranslate}
          disabled={translating || !canTranslate}
          className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--accent-teal)]/40 bg-[color:var(--accent-teal-subtle)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--accent-teal)] transition-colors hover:border-[color:var(--accent-teal)] disabled:opacity-50"
        >
          <Languages size={13} />
          {translating ? 'Translating…' : 'Translate to JP'}
        </button>
      }
    >
      {/* Title EN / JP */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Title (EN) *</label>
          <input
            type="text"
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            onBlur={onTitleBlur}
            placeholder="Getting Started with Cursor IDE"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            Title (JP)
            <MachineTag show={machineFilled.has('title_jp')} />
          </label>
          <input
            type="text"
            value={titleJp}
            onChange={(e) => setTitleJp(e.target.value)}
            placeholder="Cursor IDEの始め方"
            className={inputClass}
          />
        </div>
      </div>

      {/* Slug */}
      <div>
        <label className={labelClass}>Slug</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="auto-generated-from-title"
          className={`${inputClass} max-w-md`}
        />
      </div>

      {/* Descriptions EN / JP */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Description (EN)</label>
          <textarea
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Brief description for the content card..."
            className={textareaClass}
          />
          <p className="mt-0.5 text-right text-xs text-fg-tertiary">
            {descriptionEn.length}/500
          </p>
        </div>
        <div>
          <label className={labelClass}>
            Description (JP)
            <MachineTag show={machineFilled.has('description_jp')} />
          </label>
          <textarea
            value={descriptionJp}
            onChange={(e) => setDescriptionJp(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="コンテンツカードの簡単な説明..."
            className={textareaClass}
          />
          <p className="mt-0.5 text-right text-xs text-fg-tertiary">
            {descriptionJp.length}/500
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
