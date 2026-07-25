'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScrollSpy } from '@/components/admin/editor-shell/use-scroll-spy';
import { PartnerAdminManager, type PartnerAdminRow } from '../PartnerAdminManager';
import { PartnerEditorHeader } from './partner-editor-header';
import { PartnerEditorNav } from './partner-editor-nav';
import { IdentitySection } from './identity-section';
import { BrandingSection } from './branding-section';
import { VisibilitySection } from './visibility-section';
import { FeaturedCoursesSection } from './featured-courses-section';
import { SeatBlocksSection } from './seat-blocks-section';
import { JoinCodesSection } from './join-codes-section';
import { BenefitsSection } from './benefits-section';
import type {
  CourseOption,
  JoinCodeRow,
  PartnerBenefitsRow,
  PartnerFormData,
  SeatBlockRow,
} from './types';

type Props = {
  partner: PartnerFormData;
  featuredCourseIds: string[];
  courseOptions: CourseOption[];
  enrollmentCount: number;
  initialAdmins: PartnerAdminRow[];
  initialSeatBlocks: SeatBlockRow[];
  initialJoinCodes: JoinCodeRow[];
  initialBenefits: PartnerBenefitsRow | null;
};

const STEPS = [
  { id: 'identity', label: 'Identity' },
  { id: 'branding', label: 'Branding' },
  { id: 'visibility', label: 'Visibility' },
  { id: 'featured-courses', label: 'Featured courses' },
  { id: 'portal-access', label: 'Portal access' },
  { id: 'seat-blocks', label: 'Seat blocks' },
  { id: 'join-codes', label: 'Join codes' },
  { id: 'benefits', label: 'Benefits' },
] as const;

const STEP_IDS = STEPS.map((s) => s.id);

export function PartnerEditor({
  partner,
  featuredCourseIds,
  courseOptions,
  enrollmentCount,
  initialAdmins,
  initialSeatBlocks,
  initialJoinCodes,
  initialBenefits,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState<PartnerFormData>(partner);
  const [courseIds, setCourseIds] = useState<string[]>(featuredCourseIds);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const { activeId, scrollTo } = useScrollSpy(STEP_IDS);

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

  return (
    <div className="max-w-[1200px]">
      <PartnerEditorHeader
        partnerId={form.id}
        name={form.name_en}
        slug={form.slug}
        isActive={form.is_active}
        enrollmentCount={enrollmentCount}
        saving={saving}
        saveMessage={saveMessage}
        saveError={saveError}
        onSave={handleSave}
      />

      {/* Arbitrary grid tracks are space-separated: use `_`, never `,` — a
          comma emits invalid CSS and the whole grid silently collapses. */}
      <div className="items-start pt-6 lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-8">
        <PartnerEditorNav
          className="sticky top-[104px] hidden lg:block"
          steps={STEPS}
          activeId={activeId}
          onNavigate={scrollTo}
        />

        <div className="max-w-[880px] space-y-5">
          <IdentitySection form={form} patch={patch} />
          <BrandingSection form={form} patch={patch} />
          <VisibilitySection form={form} patch={patch} />
          <FeaturedCoursesSection
            slug={form.slug}
            courseIds={courseIds}
            courseOptions={courseOptions}
            onToggle={toggleCourse}
            onMove={moveCourse}
          />
          <PartnerAdminManager partnerId={form.id} initialAdmins={initialAdmins} />
          <SeatBlocksSection partnerId={form.id} initialBlocks={initialSeatBlocks} />
          <JoinCodesSection
            partnerId={form.id}
            initialCodes={initialJoinCodes}
            seatBlocks={initialSeatBlocks}
          />
          <BenefitsSection partnerId={form.id} initialBenefits={initialBenefits} />

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border-default pt-4">
            <Link
              href={`/api/admin/partners/${form.id}/enrollments/csv`}
              className="inline-flex items-center gap-1.5 text-sm text-fg-secondary transition-colors hover:text-fg-primary"
            >
              <FileDown size={14} /> Export CSV
            </Link>
            {form.is_active && (
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                iconPosition="left"
                onClick={handleDeactivate}
              >
                Deactivate
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
